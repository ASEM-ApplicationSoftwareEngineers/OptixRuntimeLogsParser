const fileInput = document.getElementById('logFiles');
const fileList = document.getElementById('fileList');
const addFileButton = document.getElementById('addFileButton');
const clearFilesButton = document.getElementById('clearFilesButton');

// Add file to the list
addFileButton.addEventListener('click', () => {
    if (fileInput.files.length > 0) {
        for (const file of fileInput.files) {
            const listItem = document.createElement('li');
            listItem.textContent = file.name;
            listItem.file = file; // Attach the File object to the <li>
            fileList.appendChild(listItem);
        }
        fileInput.value = ''; // Clear the input for new selections
    }
});

// Clear all selected files
clearFilesButton.addEventListener('click', () => {
    fileList.innerHTML = ''; // Clear the displayed list
});