const { openApiToBruno } = require('@usebruno/converters');
const {
  stringifyRequest,
  stringifyCollection,
  stringifyEnvironment
} = require('@usebruno/filestore');

const fs = require('fs').promises;
const path = require('path');

/**
 * Converts OpenAPI specifications to Bruno collection format.
 * 
 * This function processes all JSON files in the specified input directory, 
 * converts OpenAPI specifications to Bruno-compatible collections using 
 * `openApiToBruno` and `updateRequestBodies` helper functions, and writes 
 * the results to the output directory. It handles directory creation, 
 * file filtering, and error logging during conversion.
 * 
 * @param {string} inputDir - Directory containing OpenAPI JSON files.
 * @param {string} outputDir - Directory where converted Bruno files will be saved.
 */
async function convertOpenApiToBruno(inputDir, outputDir) {
  try {
    const files = await fs.readdir(inputDir, { withFileTypes: true });
    const jsonFiles = files
      .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.json'))
      .map(file => file.name);

    await fs.mkdir(outputDir, { recursive: true });

    for (const filename of jsonFiles) {
      const inputFilePath = path.join(inputDir, filename);
      const outputFilePath = path.join(outputDir, filename);

      try {
        const jsonContent = await fs.readFile(inputFilePath, 'utf8');
        const openApiSpec = JSON.parse(jsonContent);
        const brunoCollection = openApiToBruno(openApiSpec);
        const updatedBrunoCollection = updateRequestBodies(openApiSpec, brunoCollection);

        await fs.writeFile(outputFilePath, JSON.stringify(updatedBrunoCollection, null, 2));
        console.log(`✅ Converted: ${filename}`);
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
      }
    }

    console.log('✅ All OpenAPI JSON conversions completed!');
  } catch (error) {
    console.error('❌ Error during directory processing:', error);
  }
}

/**
 * Converts OpenAPI specifications in a directory to Bruno collections and merges them into a single collection.
 *
 * This function iterates through OpenAPI specification files in a given input directory, converts each specification to a Bruno collection using `convertOpenApiToBruno`, and merges all generated collections into a single master collection. The resulting master collection is structured as follows: `{"name": "Backend", "version": "1", "items": []}`.
 *
 * @param {string} inputDir - The directory containing the OpenAPI specification files.
 * @param {string} outputDir - The directory where the generated Bruno collections will be written.
 * @returns {Promise<object>} A promise that resolves with the merged Bruno collection object.
 * @throws {Error} If any file operation fails or if the input directory is invalid.
 */
async function mergeOpenApiCollections(collectionName, inputDir, outputDir) {
  try {
    const files = await fs.readdir(inputDir, { withFileTypes: true });
    const jsonFiles = files
      .filter(file => file.isFile() && file.name.toLowerCase().endsWith('.json'))
      .map(file => file.name);

    let apiSpecs = [];

    for (const filename of jsonFiles) {
      const inputFilePath = path.join(inputDir, filename);

      try {
        const jsonContent = await fs.readFile(inputFilePath, 'utf8');
        const openApiSpec = JSON.parse(jsonContent);

        const apiSpec = {
          type: "folder",
          name: openApiSpec.name,
          filename: openApiSpec.name,
          seq: jsonFiles.indexOf(filename),
          items: openApiSpec.items
        }

        apiSpecs.push(apiSpec)

        console.log(`✅ Converted: ${filename}`);
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
      }
    }

    let mergedCollection = { name: collectionName, version: "1", items: apiSpecs };

    await fs.writeFile(outputDir, JSON.stringify(mergedCollection, null, 2));

    return mergedCollection;
  } catch (error) {
    console.error("Error merging OpenAPI collections:", error);
    throw error;
  }
}

/**
 * Generates a test collections from test specifications.
 * 
 * This function reads a test specification file, processes the test flows 
 * defined within it, and creates a master collection in JSON format.
 * 
 * @param {string} testSpecDir - The directory containing the test specification file.
 * @param {string} brunoMasterDir - The directory containing Bruno request files.
 * @param {string} outputPath - The path where the master collection JSON file will be written.
 */
async function createBrunoJson(testSpecDir, brunoMasterDir, outputPath) {
  try {
    const testFlowContent = await fs.readFile(testSpecDir, 'utf8');
    const testFlowSpec = JSON.parse(testFlowContent);

    const masterBrunoCollectionString = await fs.readFile(brunoMasterDir, 'utf8');
    const masterBrunoCollection = JSON.parse(masterBrunoCollectionString);

    let masterName = testFlowSpec.name;
    let testFlows = [];

    for (const testFlow of testFlowSpec.test_flows) {
      let requests = [];

      for (const requestSpec of testFlow.requests) {
        const originalRequest = await acquireBrunoRequestByName(requestSpec.request_id, requestSpec.file_path, masterBrunoCollection);

        const requestItem = {
          type: "http",
          name: requestSpec.request_id,
          filename: requestSpec.request_id + ".bru",
          seq: requestSpec.seq,
          settings: {},
          tags: [],
          request: applyRequestUpdates(originalRequest, requestSpec).request
        }

        requests.push(requestItem);
      }

      const testFlowFolder = {
        type: "folder",
        name: testFlow.flow_name,
        filename: testFlow.flow_name,
        seq: testFlow.seq,
        root: testFlow.root,
        items: requests,
      }

      testFlows.push(testFlowFolder)
    }

    const masterCollection = {
      name: masterName,
      version: "1",
      items: testFlows,
      environments: testFlowSpec.environments,
      root: testFlowSpec.root
    };

    //Saving Bruno json in case it's needed for manual imports
    await fs.writeFile(outputPath, JSON.stringify(masterCollection, null, 2));

    console.log('✅ Test collection created successfully at', outputPath);

    return masterCollection;
  } catch (error) {
    console.error('❌ Error creating master collection:', error.message);
  }
}

/**
 * Applies updates to a cloned request object based on the provided spec.
 * @param {Object} originalRequest - The original request object to clone.
 * @param {Object} requestSpec - The spec containing fields to update.
 * @returns {Object} - A new request object with applied updates.
 */
function applyRequestUpdates(originalRequest, requestSpec) {
  const updatedRequest = JSON.parse(JSON.stringify(originalRequest));
  const updateFields = [
    {
      sourceKey: 'parameters',
      targetKey: 'params',
      validate: (value) => value !== undefined,
    },
    {
      sourceKey: 'script',
      targetKey: 'script',
      validate: (value) => value !== undefined,
    },
    {
      sourceKey: 'url',
      targetKey: 'url',
      validate: (value) => value !== undefined,
    },
    {
      sourceKey: 'body',
      targetKey: 'body',
      validate: (value) => {
        return (
          value !== undefined &&
          value !== null &&
          !(typeof value === 'object' && Object.keys(value).length === 0)
        );
      },
    },
  ];

  updateFields.forEach(({ sourceKey, targetKey, validate }) => {
    const value = requestSpec[sourceKey];

    if (validate(value))
      updatedRequest.request[targetKey] = value;

  });

  return updatedRequest;
}

/**
 * Acquires a Bruno request object by its name and the name of the folder it resides in.
 *
 * This function searches for a specific request within a given folder in a Bruno collection.
 * It first retrieves the folder by its name, then searches for the request within that folder's items.
 * If the request is not found, it throws an error.
 *
 * @param {string} requestName - The name of the Bruno request to acquire.
 * @param {string} folderName - The name of the folder containing the request.
 * @param {object} brunoCollection - The Bruno collection object containing the folders and requests.
 * @returns {object} The Bruno request object if found.
 * @throws {Error} If the folder or request is not found.
 */
async function acquireBrunoRequestByName(requestName, folderName, brunoCollection) {
  try {
    let folder;
    let request;
    if (folderName) {
      folder = await acquireBrunoFolderByName(folderName, brunoCollection);

      request = folder.items.find(req => req.name === requestName);
    }
    else
      request = findRequestByName(requestName, brunoCollection);

    if (!request)
      throw new Error(`Request "${requestName}" not found in folder "${folderName}".`);

    return request;
  }
  catch (error) {
    console.error('❌ Error acquiring Bruno request:', error.message);
    throw error;
  }
}

/**
 * Recursively searches a Bruno collection structure for an HTTP request with the specified name.
 * 
 * @param {string} requestName - The exact name of the HTTP request to locate
 * @param {Object} brunoCollection - The current collection or folder node to search within
 * @returns {Object|null} Returns the matching HTTP request object if found, or null if no match exists
 * 
 * The function traverses the collection hierarchy by:
 * 1. Checking each item in the current collection
 * 2. Returning immediately if an HTTP request with the target name is found
 * 3. Recursively searching nested folders if they exist
 * 4. Returning null if the end of the hierarchy is reached without finding a match
 */
function findRequestByName(requestName, brunoCollection) {
  for (const item of brunoCollection.items) {

    if (item.type === 'http-request' && item.name === requestName)
      return item;

    else if (item.type === 'folder') {
      const found = findRequestByName(requestName, item);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Asynchronously searches for a folder object with a matching name in an array of items.
 * This function is designed to locate specific folder structures within test automation
 * flows or JSON data hierarchies by exact name comparison.
 *
 * @param {string} folderName - The exact name of the folder to locate
 * @param {Array<Object>} items - Array of item objects to search through (expected to have 'name' properties)
 * @returns {Object|undefined} - Returns the matching folder object if found, otherwise undefined
 * @throws {Error} - Logs an error message to console if folder is not found
 */
async function findBrunoFolderInItems(folderName, items) {
  const item = items.find(item => item.name === folderName)

  if (item)
    return item;
  else
    console.error(folderName, "could not be found!")
}

/**
 * Asynchronously retrieves a specific folder from a Bruno API collection.
 * Reads the collection, locates a folder by name, and returns it.
 * Throws descriptive errors for invalid collection structures or missing folders.
 *
 * @param {string} folderName - The name of the folder to retrieve.
 * @param {object} brunoMasterCollection - The Bruno collection object.
 * @returns {object} The found folder object if successful.
 * @throws {Error} If the collection is invalid or the folder is not found.
 */
async function acquireBrunoFolderByName(folderName, brunoMasterCollection) {
  try {

    if (!brunoMasterCollection?.items?.length)
      throw new Error('Invalid Bruno collection structure: missing "items" array.');

    let segments = folderName.split("/")
    let innermostFolder = brunoMasterCollection;

    for (const segment of segments) {
      innermostFolder = await findBrunoFolderInItems(segment, innermostFolder.items)
    }

    if (!innermostFolder) {
      throw new Error(`Folder "${folderName}" not found in the collection.`);
    }

    if (!innermostFolder.items?.length)
      throw new Error(`Folder "${folderName}" is empty.`);

    return innermostFolder;
  } catch (error) {
    console.error('❌ Error acquiring Bruno folder:', error.message);
    throw error;
  }
}

/**
 * Updates JSON request bodies in a Bruno collection based on examples from an OpenAPI specification.
 * 
 * This function iterates through all requests in the provided Bruno collection. For each request with a "json" body mode,
 * it matches the request name to an `operationId` in the OpenAPI spec. If a matching operation is found and contains a JSON example,
 * the example is applied to the request's body. If no example is found, a warning is logged.
 * 
 * @param {Object} openApiSpec - The parsed OpenAPI specification (JSON object) containing request examples.
 * @param {Object} brunoCollection - The Bruno collection structure (JSON object) to modify. Assumes the structure includes:
 *   - `items`: An array of folders, each with an `items` array of requests.
 * @returns {Object} A deep-copied version of the modified Bruno collection with updated request bodies.
 * 
 * @throws {Error} None explicitly; however, missing `operationId` or example mismatches may result in silent warnings.
 * 
 * @example
 * // Input: OpenAPI spec with examples and a Bruno collection with "json" mode requests
 * // Output: Bruno collection with request bodies populated by JSON bodies from OAS examples.
 * const updatedCollection = setRequestBodies(openApiSpec, brunoCollection);
 * 
 * @note
 * 1. Assumes `request.name` in the Bruno collection matches `operationId` in the OpenAPI spec.
 * 2. Uses `getOASExampleValueFor()` to extract examples from the OpenAPI spec.
 * 3. Modifies a deep-copied version of the Bruno collection to avoid mutating the original.
 * 4. If no example is found for a request, the body remains unchanged, and a warning is logged.
 */
function updateRequestBodies(openApiSpec, brunoCollection) {
  const folders = JSON.parse(JSON.stringify(brunoCollection));

  for (const folder of folders.items) {

    for (const request of folder.items) {

      if (request.request.body.mode === "json") {
        const exampleValue = getOASExampleValueFor(openApiSpec, request.name);

        if (exampleValue)
          request.request.body.json = JSON.stringify(exampleValue, null, 2);
        else
          console.warn("No example found for operationId: " + request.name);
      }
    }
  }

  return folders;
}

/**
 * Extracts the `value` property from the first example in the `examples` object.
 *
 * @param {Object} content - The "application/json" content object from OpenAPI spec.
 *                           Example structure:
 *                           {
 *                             'application/json': {
 *                               examples: {
 *                                 'Booking request example': { value: {...} }
 *                               }
 *                             }
 *                           }
 * @returns {Object|null} - The `value` property of the first example, or `null` if not found.
 */
function getOASExampleValueFor(openApiSpec, targetOperationId) {
  const operation = getOpenAPIRequestSpec(openApiSpec, targetOperationId);
  const examples = operation.requestBody.content['application/json'].examples;
  const firstKey = Object.keys(examples)[0];
  //TODO: enable object references

  return examples[firstKey].value;
}

/**
 * Retrieves the request body example for an operation in an OpenAPI v3 spec
 * by its operationId.
 *
 * @param {Object} openApiSpec - Parsed OpenAPI v3 JSON object.
 * @param {string} targetOperationId - The operationId of the endpoint to search for.
 * @returns {Object|null} - Returns the example object if found, or null otherwise.
 */
function getOpenAPIRequestSpec(openApiSpec, targetOperationId) {
  const paths = openApiSpec.paths;

  for (const path in paths) {
    const pathItem = paths[path];

    for (const method in pathItem) {
      const operation = pathItem[method];

      if (operation.operationId === targetOperationId)
        return operation;
    }
  }

  console.log("'operationId' not found!")
  return null;
}

/**
 * Creates test flow directories and generates individual test files in .bru format
 * @param {Object} testCollection - Collection of test flows to process
 * @param {string} masterDir - Base directory for test output
 * Creates a directory for each test flow and saves each request as a separate .bru file
 */
async function createTestFlows(testCollection, masterDir) {
  for (const testFlow of testCollection.items) {
    const flowDir = path.join(masterDir, testFlow.name);
    await fs.mkdir(flowDir, { recursive: true });

    for (const request of testFlow.items) {
      const bruFilePath = path.join(flowDir, request.name + ".bru");
      const bruRequest = stringifyRequest(request, options = { format: 'bru' });
      await fs.writeFile(bruFilePath, bruRequest);
    }
  }
}

/**
 * Creates environment configuration files in .bru format
 * @param {Object} testCollection - Collection containing environment definitions
 * @param {string} masterDir - Base directory for test output
 * Creates an 'environments' subdirectory and saves each environment configuration as a .bru file
 */
async function createEnvironments(testCollection, masterDir) {
  if (testCollection.environments)
    for (const environment of testCollection.environments) {
      const environmentDir = path.join(masterDir, "environments");
      await fs.mkdir(environmentDir, { recursive: true });

      const bruFilePath = path.join(environmentDir, environment.name + ".bru");
      await fs.writeFile(bruFilePath, stringifyEnvironment(environment, options = { format: 'bru' }));
    }
  else
    console.warn("Test collection has no environments.")
}

/**
 * Creates the main Bruno collection root file (collection.bru)
 * @param {Object} testCollection - Collection containing root metadata
 * @param {string} masterDir - Base directory for test output
 * Generates the 'collection.bru' file that serves as the entry point for the Bruno test collection
 */
async function createBrunoRoot(testCollection, masterDir) {
  const rootFilePath = path.join(masterDir, 'collection.bru');
  await fs.writeFile(rootFilePath, stringifyCollection(testCollection.root));
}

/**
 * Creates metadata file for Bruno collection (bruno.json)
 * @param {Object} testCollection - Collection containing metadata information
 * @param {string} masterDir - Base directory for test output
 * Generates the 'bruno.json' metadata file with collection version, name, and type information
 */
async function createBrunoMetadata(testCollection, masterDir) {
  const metadata = {
    version: testCollection.version,
    name: testCollection.name,
    type: "collection"
  };

  const metadataFilePath = path.join(masterDir, 'bruno.json');
  await fs.writeFile(metadataFilePath, JSON.stringify(metadata, null, 2));
}

/**
 * Creates a Bruno collection by combining test flow compositions from a JSON file with request details derived from pre-generated Bruno collections (based on an OpenAPI spec).
 *
 * This function reads a `test-flows.json` file to obtain test flow definitions, dynamic parameters, and scripting details. It then leverages pre-existing Bruno collections (automatically generated from an OpenAPI specification) to populate the requests with necessary specifications. Finally, it structures these combined details into a complete Bruno collection with appropriate directory structure, environment definitions, and metadata.
 *
 * @param {string} testFlowsJson - Path to the `test-flows.json` file containing test flow compositions.
 * @param {string} baseBrunoCollection - Path to a base Bruno collection generated from an OpenAPI spec.
 * @returns {Promise<void>} A promise that resolves when the Bruno collection is created.
 * @throws {Error} If any file operation fails or if the input files are invalid.
 */
async function createBrunoCollection(testFlowsDir, masterCollectionDir, outputName) {
  let testCollection = await createBrunoJson(testFlowsDir, masterCollectionDir, outputName);

  const testCollectionDir = testCollection.name;
  await fs.mkdir(testCollectionDir, { recursive: true });

  createTestFlows(testCollection, testCollectionDir);
  createEnvironments(testCollection, testCollectionDir);
  createBrunoRoot(testCollection, testCollectionDir);
  createBrunoMetadata(testCollection, testCollectionDir);
}

/**
 * Orchestrates the test generation pipeline by:
 * 1. Converting OpenAPI specifications into individual Bruno collections.
 * 2. Merging those collections into a unified master collection.
 * 3. Creating a structured Bruno test collection using test flow definitions,
 *    populated with requests from the merged OpenAPI collections & test flow json.
 *
 * This pipeline automates the full lifecycle of test collection generation,
 * from specification to structured bruno collections, enabling a streamlined testing workflow.
 */
async function testGenerationPipeline() {
  await convertOpenApiToBruno("oas", "collections");
  await mergeOpenApiCollections("Petstore", "collections", "master-collection.json");
  await createBrunoCollection("test-flows.json", "master-collection.json", "test-collection.json");
}

testGenerationPipeline();