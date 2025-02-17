
try {
    const { app, core, action, constants } = require('photoshop');
    const fs = require('fs');
    const fs2 = require("uxp").storage.localFileSystem;
    let headers, inputFolder, outputFolder, template, csvfile, data; // Function to open a PSD file programmatically
    let suffix = "";
    let flatten, fileformat;
    let templateName, templatePath, csvfileName, csvfilePath, outputfolderName, outputfolderPath, inputfolderName, inputfolderPath;

    const loadPreferences = async () => {
        try {
            const folder = await fs2.getDataFolder();
            const file = await folder.getEntry("preferences.json");
            const content = await file.read();
            const preferences = JSON.parse(content);
            console.log("Preferences loaded:", preferences);
            document.getElementById("suffix").value = preferences.suffix || "";
            document.getElementById("flatten").checked = preferences.flatten || false;
            document.getElementById("fileformat").value = preferences.fileformat || "psd";
            templateName = preferences.templateName;
            templatePath = preferences.templatePath;
            csvfileName = preferences.csvfileName;
            csvfilePath = preferences.csvfilePath;
            outputfolderName = preferences.outputfolderName;
            outputfolderPath = preferences.outputfolderPath;
            inputfolderName = preferences.inputfolderName;
            inputfolderPath = preferences.inputfolderPath;

        } catch (error) {
            document.getElementById("suffix").value = "";
            document.getElementById("flatten").checked = false;
            document.getElementById("fileformat").value = "psd";

            console.error("Error loading preferences:", error);
        }
    }

    const savePreferences = async () => {
        try {
            const folder = await fs2.getDataFolder();
            const file = await folder.createEntry("preferences.json", { overwrite: true });
            const preferences = {
                suffix: document.getElementById("suffix").value,
                flatten: document.getElementById("flatten").checked,
                fileformat: document.getElementById("fileformat").value,
                templateName: template ? template.name : "",
                templatePath: template ? template.nativePath : "",
                csvfileName: csvfileName ? csvfile.name : "",
                csvfilePath: csvfile ? csvfile.nativePath : "",
                outputfolderName: outputFolder ? outputFolder.name : "",
                outputfolderPath: outputFolder ? outputFolder.nativePath : "",
                inputfolderName: inputFolder ? inputFolder.name : "",
                inputfolderPath: inputFolder ? inputFolder.nativePath : ""


            };
            suffix = preferences.suffix;
            flatten = preferences.flatten;
            fileformat = preferences.fileformat;
            templateName = preferences.templateName;
            templatePath = preferences.templatePath;
            csvfileName = preferences.csvfileName;
            csvfilePath = preferences.csvfilePath;
            outputfolderName = preferences.outputfolderName;
            outputfolderPath = preferences.outputfolderPath;
            inputfolderName = preferences.inputfolderName;
            inputfolderPath = preferences.inputfolderPath;

            await file.write(JSON.stringify(preferences));
            console.log("Preferences saved:", preferences);
        } catch (error) {
            console.error("Error saving preferences:", error);
        }
    }



    function setupListeners() {
        document.addEventListener("DOMContentLoaded", loadPreferences);
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
                    template = await fs2.getFileForOpening({ initialLocation: templatePath });
                    console.log("template", template);



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
                    outputFolder = await fs2.getFolder({ initialLocation: outputfolderPath });
                    console.log("outputfolder", outputFolder);
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
                    inputFolder = await fs2.getFolder({ initialLocation: inputfolderPath });
                    console.log("inputfolder", inputFolder);
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
                    csvfile = await fs2.getFileForOpening({ initialLocation: csvfilePath });
                    console.log(csvfile);
                    document.getElementById("csvname").textContent = ` CSVFile: ${csvfile.name} `;
                    document.getElementById("csvname").style.display = "block";
                    const text = await csvfile.read({ encoding: "utf-8" });
                    console.log(text);
                    data = parseCSV(text);
                    console.log(data[0]);
                    console.log(data[1]);

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
        //  console.log(textLayers);
        //replace the text
        for (let j = 0; j < textLayers.length; j++) {
            const textLayer = textLayers[j];
            const name = textLayer.name;
            const text = element[textLayer.name];

            if ((typeof (text) === "string") && (text.length > 0)) {
                textLayer.textItem.contents = text;
                //we don't want to change the name of the layer
                textLayer.name = name;
            } else {
                console.log(`empty text for ${textLayer.name}`);
                textLayer.textItem.contents = " ";
                textLayer.name = name;
            }
        }
    }
    sizeIt = async (element, imageDoc, imageLayer) => {
        try {
            let theType = "fit";
            console.log(`GETSIZE || ${element[imageLayer.name]} ||  ${element[imageLayer.name + "_type"]} ||`);
            if (element[imageLayer.name + "_type"]) {
                theType = element[imageLayer.name + "_type"];
            }
            if (!(theType === "distort") && !(theType === "crop")) {
                theType = "fit";
            }
            const sourceAR = imageDoc.width / imageDoc.height;
            const destAR = imageLayer.boundsNoEffects.width / imageLayer.boundsNoEffects.height;
            let width, height;
            if (theType === "distort") {
                width = imageLayer.boundsNoEffects.width;
                height = imageLayer.boundsNoEffects.height;
                await imageDoc.resizeImage(width, height);
                return;
            } else if (theType === "crop") {
                let trimwidth, trimheight;
                if (sourceAR < destAR) {
                    width = imageLayer.boundsNoEffects.width;
                    trimwidth = 0
                    height = width / sourceAR
                    trimheight = (height - imageLayer.boundsNoEffects.height) / 2
                } else {
                    height = imageLayer.boundsNoEffects.height;
                    trimheight = 0;
                    width = height * sourceAR;
                    trimwidth = (width - imageLayer.boundsNoEffects.width) / 2;
                }
                await imageDoc.resizeImage(width, height);
                let anchor = constants.AnchorPosition.MIDDLECENTER;
                let x = element[imageLayer.name + "_anchor"];
                if (Object.values(constants.AnchorPosition).includes(x)) {
                    anchor = x;
                }
                await imageDoc.revealAll();
                await imageDoc.resizeCanvas(imageLayer.boundsNoEffects.width, imageLayer.boundsNoEffects.height, anchor);
                return;
            } else {
                if (sourceAR > destAR) {
                    width = imageLayer.bounds.width;
                    height = imageLayer.bounds.width / sourceAR;
                } else {
                    height = imageLayer.bounds.height;
                    width = imageLayer.bounds.height * sourceAR;
                }
                await imageDoc.resizeImage(width, height);
                return;
            }
        } catch (error) {
            console.error("Error in sizeIt:", error);
        }
    }
    async function process() {
        core.executeAsModal(async () => {
            try {
                savePreferences();
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

                    for (let k = 0; k < openedDocument.layers.length; k++) {
                        //  console.log(`layer name is ${openedDocument.layers[k].name} and k is ${k} and length is ${openedDocument.layers.length}`);
                        inititalOrder.push(openedDocument.layers[k].name);
                    }
                    console.log(inititalOrder);
                    fixTextLayers(element, layers);
                    //get the image layers
                    const imageLayers = layers.filter(layer => (layer.kind === constants.LayerKind.SMARTOBJECT) || (layer.kind === constants.LayerKind.NORMAL));
                    //replace the images
                    for (let j = 0; j < imageLayers.length; j++) {
                        let bail = false;
                        const imageLayer = imageLayers[j];
                        const image = element[imageLayer.name];
                        let imageFile, imageDoc;
                        if (image) {
                            try {
                                imageFile = await inputFolder.getEntry(image);
                                imageDoc = await app.open(imageFile);
                            } catch (error) {
                                console.error("Error opening image:", error);
                                bail = true;
                                // await app.showAlert(`Error opening image: ${image}. Skipping.`);
                            } finally {
                                if (!bail) {

                                    await imageDoc.flatten();
                                    await sizeIt(element, imageDoc, imageLayer);
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
                                } else {
                                    console.log(`Skipping image: ${image}`);
                                    app.showAlert(`Error opening image: ${image}. Skipping.`);
                                }
                            }
                        } else {
                            imageLayer.visible = false;
                        }
                    }
                    //make sure the layers are in the same order
                    openedDocument.layers.getByName(inititalOrder[0]).move(openedDocument.layers[0], constants.ElementPlacement.PLACEBEFORE);
                    let refLayer = openedDocument.layers.getByName(inititalOrder[0]);
                    // console.log("0",refLayer);
                    //  console.log("0",refLayer.name);
                    for (let k = 1; k < inititalOrder.length; k++) {
                        // console.log(k);
                        //   console.log(`${inititalOrder[k]}:  Moving ${openedDocument.layers.getByName(inititalOrder[k]).name} below ${refLayer.name}`);
                        openedDocument.layers.getByName(inititalOrder[k]).move(refLayer, constants.ElementPlacement.PLACEAFTER);
                        refLayer = openedDocument.layers.getByName(inititalOrder[k]);
                        //   console.log(k,refLayer);
                        //  console.log(k,refLayer.name);
                    }
                    inititalOrder = [];
                    try {   //save the file
                        app.activeDocument = openedDocument;
                        if (flatten) {
                            await action.batchPlay(
                                [
                                    { "_obj": "flattenImage" }
                                ], {});
                        }
                        await openedDocument.save();
                        console.log(`File format is ${fileformat}`);
                        if (fileformat === "jpg") {
                            console.log("Saving as jpg");
                            const newjpg = await outputFolder.createFile(`${openedDocument.name.replace(".psd", ".jpg")}`, { overwrite: true });
                            await openedDocument.saveAs.jpg(newjpg, { quality: 12 }, true);
                            const ent = await outputFolder.getEntry(openedDocument.name);
                            ent.delete();
                        } else if (fileformat === "png") {
                            console.log("Saving as png");
                            const newpng = await outputFolder.createFile(`${openedDocument.name.replace(".psd", ".png")}`, { overwrite: true });
                            await openedDocument.saveAs.png(newpng, { compression: 6 }, true);
                            const ent = await outputFolder.getEntry(openedDocument.name);
                            ent.delete();
                        }
                    } catch (error) {
                        console.error("Error saving file:", error);
                    }
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
            if (lines[i].trim().length == 0) {
                continue;
            }
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
