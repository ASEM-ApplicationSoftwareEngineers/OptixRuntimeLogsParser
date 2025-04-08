document.getElementById('logForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    // Retrieve the selected files from the file list
    const fileList = document.getElementById('fileList');
    const selectedFiles = Array.from(fileList.children).map((li) => li.file);
    if (selectedFiles.length === 0) {
        alert('Please upload at least one log file.');
        return;
    }

    const pagesData = {};
    const pageStack = [];
    const pageCounter = {};
    let capturingNested = false;

    // Read and process all files
    for (const file of selectedFiles) {
        const content = await file.text();
        const lines = content.split('\n');
        for (const line of lines) {
            processLine(line, pagesData, pageStack, pageCounter, capturingNested);
        }
    }

    // Generate Markdown output
    const markdownOutput = generateMarkdownOutput(Object.values(pagesData));
    document.getElementById('output').textContent = markdownOutput;
});

function processLine(line, pagesData, pageStack, pageCounter, capturingNested) {
    try {
        const rootMatch = line.match(/AddItem begin \(root\);;([^;]+)/);
        const nestedMatch = line.match(/AddItem begin \(nested root\);;([^;]+)/);
        const endRootMatch = line.match(/AddItem end \(root\);;([^;]+)/);
        const endNestedMatch = line.match(/AddItem end \(nested root\);;([^;]+)/);

        if (rootMatch) {
            const pageName = rootMatch[1].split('/').pop();
            const uniqueName = getUniquePageName(pageName, pageCounter);
            pagesData[uniqueName] = createPageInstance(pageName);
            pageStack.push(uniqueName);
            capturingNested = false;
        } else if (nestedMatch) {
            const pageName = nestedMatch[1].split('/').pop();
            const uniqueName = getUniquePageName(pageName, pageCounter);
            pagesData[uniqueName] = createPageInstance(pageName);
            pageStack.push(uniqueName);
            capturingNested = true;
        }

        addPerformanceData(line, pagesData, pageStack, capturingNested);

        if (endNestedMatch) {
            const nestedPage = endNestedMatch[1].split('/').pop();
            if (pageStack.length && pageStack[pageStack.length - 1].startsWith(nestedPage)) {
                pageStack.pop();
            }
        }

        if (endRootMatch) {
            const rootPage = endRootMatch[1].split('/').pop();
            if (pageStack.length && pageStack[pageStack.length - 1].startsWith(rootPage)) {
                pageStack.pop();
            }
        }

        const addItemMatch = line.match(/AddItem,(\d+)/);
        if (addItemMatch) {
            for (let i = pageStack.length - 1; i >= 0; i--) {
                const lastPage = pagesData[pageStack[i]];
                if (lastPage && lastPage.nested === false) {
                    lastPage.totalLoadTime = parseInt(addItemMatch[1], 10);
                    break;
                }
            }
        }
    } catch (error) {
        console.error('Error processing line:', error);
    }
}

function getUniquePageName(pageName, pageCounter) {
    if (!pageCounter[pageName]) {
        pageCounter[pageName] = 0;
    }
    pageCounter[pageName]++;
    return `${pageName}_${pageCounter[pageName]}`;
}

function createPageInstance(pageName) {
    return {
        pageName: pageName,
        totalLoadTime: 0,
        createNodes: 0,
        uiObjects: 0,
        nodesTime: 0,
        uiTime: 0,
        entries: [],
        nested: false
    };
}

function addPerformanceData(line, pagesData, pageStack, capturingNested) {
    if (!pageStack.length) return;

    const currentPage = pageStack[pageStack.length - 1];

    const match = line.match(/Start ([^,]+),(\d+),(\d+),([\d.]+)/);
    if (match) {
        const moduleName = match[1];
        const benchmark1 = parseInt(match[2], 10);
        const benchmark2 = parseInt(match[3], 10);
        if (benchmark1 > 0 || benchmark2 > 0) {
            pagesData[currentPage].entries.push([moduleName, benchmark1, benchmark2]);
        }
    }

    const createMatch = line.match(/Create nodes,(\d+),(\d+),([\d.]+),UI objects,(\d+),(\d+),([\d.]+)/);
    if (createMatch) {
        pagesData[currentPage].createNodes = parseInt(createMatch[2], 10);
        pagesData[currentPage].nodesTime = parseFloat(createMatch[1]);
        pagesData[currentPage].uiObjects = parseInt(createMatch[5], 10);
        pagesData[currentPage].uiTime = parseFloat(createMatch[4]);
    }

    if (capturingNested) {
        pagesData[currentPage].nested = true;
    }
}

function generateMarkdownOutput(pageInstances) {
    let output = '# Page Load Timing Report\n\n';

    for (const instance of pageInstances) {
        const cleanPageName = instance.pageName.replace(/_\d+$/, '');

        if (instance.nested) {
            output += `### ${cleanPageName}\n\n`;
        } else {
            output += `## ${cleanPageName}\n\n`;
            output += `Total load time: ${formattedValue(instance.totalLoadTime)} ms\n\n`;
        }
        output += `- Nodes: ${instance.createNodes} (${formattedValue(instance.nodesTime)} ms)\n`;
        output += `- UI Objects: ${instance.uiObjects} (${formattedValue(instance.uiTime)} ms)\n\n`;

        if (instance.entries.length) {
            output += '| Module Name | Total Load Time (ms) | Number of Items |\n';
            output += '| --- | --- | --- |\n';
            for (const [moduleName, benchmark1, benchmark2] of instance.entries) {
                output += `| ${moduleName} | ${formattedValue(benchmark1)} | ${formattedValue(benchmark2)} |\n`;
            }
        }
        output += '\n';
    }

    return output;
}

function formattedValue(value) {
    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
}