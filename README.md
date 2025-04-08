# FactoryTalk Optix Runtime logs parser

## Overview

This HTML file represents the main structure of a web-based application designed to parse FactoryTalk Optix runtime log files. The application allows users to upload `.log` files, process them, and view the parsed output in both raw and rendered Markdown formats. Additionally, users can download the parsed output as a Markdown file.

This application is available at: [FactoryTalk Optix Runtime Logs Parser](https://asem-applicationsoftwareengineers.github.io/OptixRuntimeLogsParser/).

## Application details

### Supported features

- Parsing `.log` files to extract performance data, warnings, and errors.
- Generating a structured Markdown report from the parsed log data.
- Displaying the parsed output in both raw and rendered Markdown formats.
- Allowing users to download the parsed output as a Markdown file.
- Extracting and organizing performance metrics such as load times, created nodes, and UI objects.
- Handling nested and root-level log entries for detailed analysis.
- Identifying and categorizing warnings and errors from the log files.
- Providing a user-friendly interface to analyze the licensing status of the application.
- Supporting multiple file uploads for batch processing of log files.
- Ensuring client-side processing for enhanced security and privacy.
- Providing a user-friendly interface for file upload and output visualization.
- Supporting dynamic updates to the output display based on user actions.

### Application Security

1. **Client-Side Processing**:

    - All file processing is handled on the client side using JavaScript (`scripts/uploader.js` and `scripts/processor.js`). This reduces the risk of server-side vulnerabilities, as no files are uploaded to a server for processing.

2. **File Handling**:

    - Uploaded files are temporarily stored in memory on the client side and are not persisted to any server or external storage. This ensures that sensitive log data remains on the user's device and is not exposed to external systems.

3. **Output Display**:

    - The parsed output is displayed within the browser using a `<pre>` element for raw output and a `<div>` for rendered Markdown. This ensures that the output is sandboxed within the browser environment, minimizing the risk of unintended execution of malicious content.

4. **Download Functionality**:

    - The application provides a button to download the parsed output as a Markdown file. This functionality is implemented entirely on the client side, ensuring that no data is transmitted to external servers.

5. **Volatile Storage**:

    - The application does not use any persistent storage mechanisms (e.g., local storage, cookies) to store user data or uploaded files. All data is kept in memory and is cleared when the page is refreshed or closed.

6. **No external libraries**:

    - The application does not rely on any external libraries or frameworks for file processing or rendering. All functionality is implemented using standard HTML, CSS, and JavaScript, reducing the attack surface and ensuring that the code is easy to audit.

7. **CORS and Same-Origin Policy**:

    - The application does not make any cross-origin requests or rely on external APIs, ensuring that it operates within the same-origin policy of the browser. This minimizes the risk of cross-site scripting (XSS) attacks and other vulnerabilities associated with cross-origin resource sharing.

### File Storage and Processing

1. **File Upload**:
    - Users upload `.log` files through the file input element (`<input type="file" id="logFiles">`). The selected files are displayed in a list (`<ul id="fileList">`) for user confirmation.

2. **File Processing**:

    - Uploaded files are processed by JavaScript code in `scripts/processor.js`. The processing logic parses the log data and converts it into a Markdown format.

3. **Output Storage**:

    - The parsed output is temporarily stored in memory and displayed in the `<pre>` element (`id="output"`) and the `<div>` element (`id="renderedMarkdown`). These elements are dynamically updated based on the user's actions.

4. **Download Location**:

    - The parsed output can be downloaded as a Markdown file using the "Download parsed output as Markdown" button (`id="downloadButton`). The file is generated and downloaded directly to the user's local file system without involving any server-side storage.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
