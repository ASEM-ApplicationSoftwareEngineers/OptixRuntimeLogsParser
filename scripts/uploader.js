const fileInput = document.getElementById('logFiles');
const fileList = document.getElementById('fileList');
const addFileButton = document.getElementById('addFileButton');
const clearFilesButton = document.getElementById('clearFilesButton');
const uploadedFilesBlock = document.getElementById('selectedFilesBlock');

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
        uploadedFilesBlock.style.display = 'block'; // Show the selected files block
    }
    else
    {
        uploadedFilesBlock.style.display = 'none'; // Hide the selected files block if no files are selected
    }
});

// Clear all selected files
clearFilesButton.addEventListener('click', () => {
    fileList.innerHTML = ''; // Clear the displayed list
});