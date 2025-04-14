/**
 * Type: Micro Service
 * Description: A short-lived service which is expected to complete within a fixed period of time.
 * @param {CbServer.BasicReq} req
 * @param {string} req.systemKey
 * @param {string} req.systemSecret
 * @param {string} req.userEmail
 * @param {string} req.userid
 * @param {string} req.userToken
 * @param {boolean} req.isLogging
 * @param {[id: string]} req.params
 * @param {CbServer.Resp} resp
 */

function fiveMinNormalizer(req, resp) {
    // These are parameters passed into the code service
    var params = req.params;

    var mqtt = new MQTT.Client();
    var MQTT_NORMALIZER_TOPIC = "_monitor/asset/default/data";
    var OUTGOING_DB_TOPIC_PLATFORM = "live/monitor/asset/<ASSET_ID>/locationAndStatus";

    function randomIntFromInterval(min, max) { // min and max included 
        return Math.floor((Math.random() * (max - min) + min) * 10) / 10;
    }

    var assets = ClearBladeAsync.Collection("assets");

    assets
        .fetch()
        .then(function (data) {
            if (!data.DATA || data.DATA.length === 0) {
                log("No assets found in collection");
                resp.success("No assets to process");
                return null; // Return null to skip further processing
            }

            log("Found " + data.DATA.length + " assets to process");
            var promises = [];

            for (var i = 0; i < data.DATA.length; i++) {
                var asset = data.DATA[i];
                log("Processing asset " + asset.id);
                
                var assetModelMsg = {
                    id: asset.id,
                    type: asset.type,
                    last_updated: new Date().toISOString(),
                    custom_data: {}
                };

                var sendMessage = true;
                var custom_data;
                
                try {
                    custom_data = JSON.parse(asset.custom_data);
                } catch (parseErr) {
                    log("Error parsing custom_data for asset " + asset.id + ": " + parseErr);
                    continue; // Skip this asset if custom_data is invalid
                }

                if (assetModelMsg.type === "PipelineMonitor") {
                    assetModelMsg.custom_data.pressure = randomIntFromInterval(800, 1250);
                    assetModelMsg.custom_data.flow_rate = randomIntFromInterval(0.5, 5);
                    assetModelMsg.custom_data.total_flow = custom_data.total_flow + randomIntFromInterval(5, 10);
                } else if (assetModelMsg.type === "GasMonitor") {
                    assetModelMsg.custom_data.pressure = randomIntFromInterval(0.5, 4.5);
                } else if (assetModelMsg.type === "Liquefaction Train") {
                    assetModelMsg.custom_data["Natural Gas Feed Temperature"] = randomIntFromInterval(33, 48);
                    assetModelMsg.custom_data["Acid Gas Removal Temperature"] = randomIntFromInterval(12, 29);
                    assetModelMsg.custom_data["Acid Gas Removal Pressure"] = randomIntFromInterval(10, 20);
                    assetModelMsg.custom_data["Gas Chilling Temperature"] = randomIntFromInterval(-35, 55);
                    assetModelMsg.custom_data["Gas Chilling Pressure"] = randomIntFromInterval(4, 11);
                    assetModelMsg.custom_data["Propane Level"] = randomIntFromInterval(70, 88);
                } else {
                    log("Skipping asset " + asset.id + " with unsupported type: " + assetModelMsg.type);
                    sendMessage = false;
                }

                if (sendMessage) {
                    // Create a promise for this asset's processing
                    promises.push(new Promise(function(resolve, reject) {
                        try {
                            var msgString = JSON.stringify(assetModelMsg);
                            mqtt.publish(MQTT_NORMALIZER_TOPIC, msgString);
                            log("Successfully published message for asset " + assetModelMsg.id);
                            resolve(assetModelMsg.id);
                        } catch (err) {
                            log("Error publishing message for asset " + assetModelMsg.id + ": " + JSON.stringify(err));
                            reject({
                                asset_id: assetModelMsg.id,
                                error: err
                            });
                        }
                    }));
                }
            }

            if (promises.length === 0) {
                log("No valid assets to process");
                resp.success("No valid assets to process");
                return null;
            }

            log("Processing " + promises.length + " assets");
            return Promise.all(promises); // Wait for all MQTT publishes to complete
        })
        .then(function(results) {
            if (results === null) {
                return; // Already handled response
            }
            log("Successfully processed " + (results ? results.length : 0) + " assets");
            resp.success('Successfully processed and published asset data');
        })
        .catch(function (err) {
            var errorMsg = "Failed to process assets: " + JSON.stringify(err);
            log("Error: " + errorMsg);
            resp.error(errorMsg);
        });
}