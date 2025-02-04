

try {
    const { app, core, action, constants } = require('photoshop');
    const fs = require('fs');
    const fs2 = require("uxp").storage.localFileSystem;
    let headers, inputFolder, outputFolder, template, csvfile, data; // Function to open a PSD file programmatically
    let suffix = "";
    function setupListeners() {

        document.getElementById("process").addEventListener("click", async () => {
            try {
                suffix = document.getElementById("suffix").value;
                if (template && csvfile && outputFolder && data && inputFolder) {
                    await process();
                } else {
                    core.showAlert("Please select all files, folders");
                }


            } catch (error) {
                console.error("Error opening file:", error);
            };
        });
        document.getElementById("loadtemplate").addEventListener("click", async () => {
            try {
                await core.executeAsModal(async () => {  // Open a file given entry
                    template = await fs2.getFileForOpening();



                    document.getElementById("templatename").textContent = ` Template: ${template.name} `;
                    document.getElementById("templatename").style.display = "block";
                }, {});
            } catch (error) {
                console.error("Error opening file:", error);
            };
        });
        document.getElementById("chooseoutput").addEventListener("click", async () => {
            try {
                await core.executeAsModal(async () => {  // Open a file given entry
                    outputFolder = await fs2.getFolder();
                    console.log(outputFolder);
                    document.getElementById("outputname").textContent = ` outputFolder: ${outputFolder.name} path: ${outputFolder.nativePath}`;
                    document.getElementById("outputname").style.display = "block";
                }, {});
            } catch (error) {
                console.error("Error opening file:", error);
            };


        });
        document.getElementById("chooseinput").addEventListener("click", async () => {
            try {
                await core.executeAsModal(async () => {  // Open a file given entry
                    inputFolder = await fs2.getFolder();
                    console.log(inputFolder);
                    document.getElementById("inputname").textContent = ` inputFolder: ${inputFolder.name} path: ${inputFolder.nativePath}`;
                    document.getElementById("inputname").style.display = "block";
                }, {});
            } catch (error) {
                console.error("Error opening file:", error);
            };


        });
        document.getElementById("loadcsv").addEventListener("click", async () => {
            console.log("button clicked");
            try {
                await core.executeAsModal(async () => {  // Open a file given entry

                    // Get the object of a File instance
                    csvfile = await fs2.getFileForOpening();
                    console.log(csvfile);
                    document.getElementById("csvname").textContent = ` CSVFile: ${csvfile.name} `;
                    document.getElementById("csvname").style.display = "block";
                    const text = await csvfile.read({ encoding: "utf-8" });
                    console.log(text);
                    data = parseCSV(text);
                    console.log(data);

                }, {});
            } catch (error) {
                console.error("Error opening file:", error);
            };

        });
    }
    const destroyVars = () => {
        headers = null;
        inputFolder = null;
        outputFolder = null;
        template = null;
        csvfile = null;
        data = null;
        document.getElementById("templatename").style.display = "none";
        document.getElementById("outputname").style.display = "none";
        document.getElementById("csvname").style.display = "none";
        document.getElementById("inputname").style.display = "none";
        document.getElementById("suffix").value = "";
    }
    async function copyToFolder(element) {
        await template.copyTo(outputFolder, { overwrite: true });
        //renamethe file
        const newFile = await outputFolder.getEntry(template.name);
        let newname;
        if (element['filename']) {
            newname = `${element["filename"]}${suffix}.psd`;
        } else {
            newname = `${element[headers[0]]}${suffix}.psd`;
        }
        //stripping out illegal characters
        newname = newname.replace(/[\\/:*?"<>|#]/g, '');
        await outputFolder.renameEntry(newFile, newname, { overwrite: true });
        return newFile;
    }
    const fixTextLayers = (element, layers) => {
        const textLayers = layers.filter(layer => layer.kind === constants.LayerKind.TEXT);
        console.log(textLayers);
        //replace the text
        for (let j = 0; j < textLayers.length; j++) {
            const textLayer = textLayers[j];
            const text = element[textLayer.name];
            if (text) {
                textLayer.textItem.contents = text;
            }
        }
    }
    async function process() {
        core.executeAsModal(async () => {
            try {
                let inititalOrder = [];
                console.log("Processing");
                for (let i = 0; i < data.length; i++) {
                    const element = data[i];
                    const newFile = await copyToFolder(element);
                    //copy the template to the output folder
                    //open the file
                    const openedDocument = await app.open(newFile);
                    //  console.log(openedDocument);
                    // Make it the active document
                    app.activeDocument = openedDocument;
                    console.log(`Opened and set active: ${openedDocument.title}`);
                    //get the layers
                    const layers = openedDocument.layers;
                    //get the text layers
                    console.log('At Start');
                    for (let k = 0; k < openedDocument.layers.length; k++) {
                        //  console.log(`layer name is ${openedDocument.layers[k].name} and k is ${k} and length is ${openedDocument.layers.length}`);
                        inititalOrder.push(openedDocument.layers[k].name);
                    }

                    fixTextLayers(element, layers);
                    //get the image layers
                    const imageLayers = layers.filter(layer => (layer.kind === constants.LayerKind.SMARTOBJECT) || (layer.kind === constants.LayerKind.NORMAL));
                    console.log(imageLayers);
                    //replace the images
                    for (let j = 0; j < imageLayers.length; j++) {
                        const imageLayer = imageLayers[j];
                        const image = element[imageLayer.name];
                        if (image) {
                            const imageFile = await inputFolder.getEntry(image);
                            const imageDoc = await app.open(imageFile);
                            await imageDoc.flatten();
                            // await imageLayer.rasterize();
                            const sourceAR = imageDoc.width / imageDoc.height;
                            const destAR = imageLayer.bounds.width / imageLayer.bounds.height;
                            let width, height;
                            if (sourceAR > destAR) {
                                width = imageLayer.bounds.width;
                                height = imageLayer.bounds.width / sourceAR;
                            } else {
                                height = imageLayer.bounds.height;
                                width = imageLayer.bounds.height * sourceAR;
                            }
                            await imageDoc.resizeImage(width, height);
                            await imageDoc.layers[0].duplicate(openedDocument, constants.ElementPlacement.PLACEATEND, "replacement");



                            const centerX = (imageLayer.bounds.left + imageLayer.bounds.right) / 2;
                            const centerY = (imageLayer.bounds.top + imageLayer.bounds.bottom) / 2;
                            const b = openedDocument.layers.getByName("replacement").bounds;
                            let index;
                            for (let k = 0; k < openedDocument.layers.length; k++) {
                                //  console.log(`layer name is ${openedDocument.layers[k].name} and k is ${k} and length is ${openedDocument.layers.length}`);
                                if (openedDocument.layers[k].name === "replacement") {
                                    index = openedDocument.layers.length - 1 - k;
                                    break;
                                }
                            }

                            app.activeDocument = openedDocument;
                            await action.batchPlay(
                                [

                                  
                                    { "_obj": "select", "_target": [{ "_name": "replacement", "_ref": "layer" }], "makeVisible": false },
                                    { "_obj": "move", "_target": [{ "_enum": "ordinal", "_ref": "layer" }], "to": { "_obj": "offset", "horizontal": { "_unit": "pixelsUnit", "_value": centerX - b.width / 2 }, "vertical": { "_unit": "pixelsUnit", "_value": centerY - b.height / 2 } } }
                                ], {});
                            await action.batchPlay(
                                [
                                    { "_obj": "select", "_target": [{ "_name": imageLayer.name, "_ref": "layer" }], "makeVisible": false },
                                    { "_obj": "duplicate", "_target": [{ "_ref": "layerEffects" }, { "_enum": "ordinal", "_ref": "layer" }], "to": { "_index": index, "_ref": "layer" } }
                                ], {});

                            const theName = imageLayer.name;
                            openedDocument.layers.getByName("replacement").move(imageLayer, constants.ElementPlacement.PLACEBEFORE);
                            if (imageLayer.isClippingMask) {
                                //  openedDocument.layers.getByName("replacement").isClippingMask = true;
                                await action.batchPlay(
                                    [
                                      {
                                        "_obj": "select",
                                        "_target": [
                                            {
                                                "_ref": "layer",
                                                "_name": "replacement"
                                            }
                                        ]
                                    },
                                        { "_obj": "groupEvent", "_target": [{ "_enum": "ordinal", "_ref": "layer" }] }
                                    ], {});

                            }
                            //copy any layer mask
                            await action.batchPlay(
                                [
                                    { "_obj": "make", "at": { "_ref": [{ "_enum": "channel", "_ref": "channel", "_value": "mask" }, { "_name": "replacement", "_ref": "layer" }] }, "duplicate": true, "new": { "_class": "channel" }, "using": { "_ref": [{ "_enum": "channel", "_ref": "channel", "_value": "mask" }, { "_name": imageLayer.name, "_ref": "layer" }] } }
                                ], {});

                            imageLayer.delete();
                            openedDocument.layers.getByName("replacement").name = theName;
                            //  openedDocument.layers.getByName(theName).move(openedDocument.layers[0], constants.ElementPlacement.PLACEBEFORE);
                            imageDoc.closeWithoutSaving();

                        }
                    }
                    //make sure the layers are in the same order
                    openedDocument.layers.getByName(inititalOrder[0]).move(openedDocument.layers[0], constants.ElementPlacement.PLACEBEFORE);
                    let refLayer = openedDocument.layers.getByName(inititalOrder[0]);
                    for (let k = 1; k < inititalOrder.length; k++) {
                        console.log(`Moving ${openedDocument.layers.getByName(inititalOrder[k])} below ${refLayer}`);
                        openedDocument.layers.getByName(inititalOrder[k]).move(refLayer, constants.ElementPlacement.PLACEAFTER);
                        refLayer = openedDocument.layers.getByName(inititalOrder[k]);
                    }

                    inititalOrder = [];
                    //save the file
                    await openedDocument.save();
                    //close the file
                    await openedDocument.close();
                }
                app.showAlert(`Processing complete: ${data.length} files processed,  outputFolder: ${outputFolder.name}`);
                destroyVars();
            }
            catch (error) {
                console.error("Error in process:", error);
            }
        }, {});
    }
    // Function to parse a CSV file content
    function parseCSV(content) {
        const lines = content.split('\n');
        const result = [];
        headers = parseLine(lines[0]);

        for (let i = 1; i < lines.length; i++) {
            let row = parseLine(lines[i]);
            let obj = {};

            headers.forEach((header, index) => {
                obj[header.trim()] = row[index] ? row[index].trim() : '';
            });

            if (Object.keys(obj).length > 0) {
                result.push(obj);
            }
        }

        return result;
    }

    // Function to parse a single line in the CSV
    function parseLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }

    async function openDocument(filePath) {
        try {
            core.executeAsModal(async () => {
                const entryPath = await fs2.getEntryWithUrl(filePath);
                const openedDocument = await app.open(entryPath);
                //  console.log(openedDocument);
                // Make it the active document
                app.activeDocument = openedDocument;
                console.log(`Opened and set active: ${openedDocument.title}`);
            }, {});
        } catch (error) {
            console.error("Error opening document:", error);
        }
    }
    setupListeners();
} catch (error) {
    console.error("Error in main.js:", error);
}
