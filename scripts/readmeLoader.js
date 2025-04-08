document.getElementById('toggleReadmeButton').addEventListener('click', async () => {
    const readmeContent = document.getElementById('readmeContent');
    const button = document.getElementById('toggleReadmeButton');

    if (readmeContent.style.display === 'none') {
        // Fetch and render the README content
        try {
            const response = await fetch('README.md');
            if (!response.ok) {
                throw new Error('Failed to load README file.');
            }
            const markdown = await response.text();
            readmeContent.innerHTML = marked.parse(markdown); // Render Markdown using marked.js
            readmeContent.style.display = 'block';
            button.textContent = 'Hide README';
        } catch (error) {
            readmeContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
            readmeContent.style.display = 'block';
        }
    } else {
        // Collapse the accordion
        readmeContent.style.display = 'none';
        button.textContent = 'Show README';
    }
});