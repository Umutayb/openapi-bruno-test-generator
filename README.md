# Test Flow Generation Module

This module automates the generation of structured Bruno test collections from OpenAPI specifications and test flow definitions. It streamlines the process of creating comprehensive and organized test suites for your APIs.

## Features

* **OpenAPI to Bruno Conversion:** Converts OpenAPI specifications into individual Bruno collections.
* **Collection Merging:** Merges multiple OpenAPI collections into a unified master collection.
* **Test Flow Composition:** Creates structured Bruno collections using test flow definitions, populated with requests from merged OpenAPI collections.
* **Automated Directory Structure:** Generates a well-organized directory structure for your Bruno test collections.
* **Environment Configuration:** Supports the creation of environment configuration files in .bru format.

## Prerequisites

* Node.js (version 16 or higher)
* npm (Node Package Manager)

## Installation

1.  Clone or download the repository.
2.  Navigate to the project directory.
3.  Install the dependencies:

    ```bash
    npm install
    ```

## Usage

1.  **Prepare your OpenAPI specifications:** Ensure you have valid OpenAPI specification files (e.g., `oas/openapi.yaml`).
2.  **Define your test flows:** Create a `test-flows.json` file that defines the structure and composition of your test flows.  This file specifies which requests from the merged OpenAPI collections should be included in each test flow.
3.  **Run the test generation script:**

    ```bash
    node testflow-generation.js
    ```

This script will:

*   Convert the OpenAPI specifications to Bruno collections.
*   Merge the individual collections into a master collection.
*   Create a structured Bruno test collection based on your `test-flows.json` definition.
*   Generate the necessary directory structure and files.

## File Structure

After running the script, the following files and directories will be created:

*   `collections/`: Contains the individual Bruno collections generated from the OpenAPI specifications.
*   `master-collection.json`:  The merged master collection.
*   `test-collection.json`: The final structured Bruno collection.
*   `test-collection/`: A directory containing the generated test flow files, environment configurations, and Bruno metadata.
    *   `collection.bru`: Root file for Bruno collection
    *   `bruno.json`: Bruno metadata
    *   `environments/`: Contains environment configuration files (.bru)
    *   Test flow directories with individual .bru request files.

## Configuration

The script currently uses hardcoded paths for the OpenAPI specifications and test flow definitions.  Future enhancements may include configuration options to customize these paths.

## Contributing

Contributions are welcome! Please submit pull requests with clear descriptions of your changes.

## License

[MIT License](LICENSE)