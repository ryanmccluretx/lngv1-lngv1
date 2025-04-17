/**
 * @typedef {{prefix: string, entity_id: string, component_id: string, mfe_settings: Record<string, unknown>}} InstallParams
 * @param {CbServer.BasicReq & {params: InstallParams}} req
 * @param {CbServer.Resp} resp
 */

function lngv1_teardown(req, resp) {
  const params = req.params;
  //component teardown behavior here. Undo any setup done in the setup service

  const tableItemsUrl = "https://" + cbmeta.platform_url + "/api/v/1/code/" + req.systemKey + "/deleteTableItems?id=";
  var superUserToken = "";


  function getSuperUser() {
    return new Promise(function (resolve, reject) {
      ClearBladeAsync.Users().read(ClearBladeAsync.Query().equalTo("email", "iacomponent@clearblade.com"))
      .then(function (response) {
        if (response.length > 0) {
          superUserToken = response[0].cb_token;
        }
        resolve();
      })
      .catch(function (error) {
        reject(error);
      });
    });
  }

  function deleteSuperUser() {
    return new Promise(function (resolve, reject) {
      const userOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ClearBlade-UserToken": superUserToken
        },
        body: JSON.stringify({"name":"users.delete","body":{"emails":["iacomponent@clearblade.com"]}})
      };

      fetch("https://" + cbmeta.platform_url + "/api/v/1/code/" + req.systemKey + "/manageUsers?id=users.delete", userOptions)
      .then(function (response) {
        if (!response.ok && response.status !== 404) {
          reject(new Error("Failed to delete user iacomponent@clearblade.com: " + response.statusText));
        } else {
          console.debug("Super User and roles deleted");
          resolve();
        }
      })
      .catch(function (error) {
        reject(error);
      });
    });
  }

  function deleteAssetType(assetType) {
    return new Promise(function (resolve, reject) {
      const assetTypeOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ClearBlade-UserToken": superUserToken
        },
        body: JSON.stringify({"name":"assetTypes.delete","body":{"id":assetType}})
      };

      fetch(tableItemsUrl + "assetTypes.delete", assetTypeOptions)
      .then(function (response) {
        if (!response.ok && response.status !== 404) {
          reject(new Error("Failed to delete " + assetType + " asset type: " + response.statusText));
        } else {
          resolve();
        }
      })
      .catch(function (error) {
        reject(error);
      });
    });
  }

  function deleteAsset(asset) {
    return new Promise(function (resolve, reject) {
      const assetOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ClearBlade-UserToken": superUserToken
        },
        body: JSON.stringify({"name":"assets.delete","body":{"id":asset}})
      };

      fetch(tableItemsUrl + "assets.delete", assetOptions)
      .then(function (response) {
        if (!response.ok && response.status !== 404) {
          reject(new Error("Failed to delete " + asset + " asset: " + response.statusText));
        } else {
          resolve();
        }
      })
      .catch(function (error) {
        reject(error);
      });
    });
  }

  function deleteDashboard() {
    return new Promise(function (resolve, reject) {
      const assetOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ClearBlade-UserToken": superUserToken
        },
        body: JSON.stringify({"name":"dashboards.delete","body":{"id":"76456012-2e48-40ff-98cc-7cf1d3d1f810"}})
      };

      fetch(tableItemsUrl + "dashboards.delete", assetOptions)
      .then(function (response) {
        if (!response.ok && response.status !== 404) {
          reject(new Error("Failed to delete dashboard: " + response.statusText));
        } else {
          resolve();
        }
      })
      .catch(function (error) {
        reject(error);
      });
    });
  }

  getSuperUser().then(function () {
    if (superUserToken) {
      console.debug("Deleting assets");

      //Delete all assets
      return Promise.allSettled([
        deleteAsset("Storage Tank 1"),
        deleteAsset("Storage Tank 2"),
        deleteAsset("Storage Tank 3"),
        deleteAsset("Southeast Gas Monitor"),
        deleteAsset("Northwest Gas Monitor"),
        deleteAsset("Incoming Pipeline Monitor"),
        deleteAsset("LNG Vessel 1"),
        deleteAsset("LNG Vessel 2"),
        deleteAsset("Train 1"),
        deleteAsset("Train 2"),
        deleteAsset("Train 3")
      ]);
    } else {
      console.debug("Not deleting assets");  
    }
    
    return Promise.resolve();
  })
  .then(function (results) {
    if (superUserToken) {
      console.debug("Assets deleted");

      console.debug("Deleting asset types");
      //Delete all asset types
      return Promise.allSettled([
        deleteAssetType("CargoContainer"),
        deleteAssetType("LNG Storage Tank"),
        deleteAssetType("Pipeline Monitor"),
        deleteAssetType("GasMonitor"),
        deleteAssetType("Liquefaction Train")
      ]);
    } else {
      console.debug("Not deleting asset types");
    }
    return Promise.resolve();
  })
  .then(function () {
    if (superUserToken) {
      console.debug("Asset Types deleted");

      console.debug("Deleting dashboard");
      return deleteDashboard();
   }
    return Promise.resolve();
  })
  .then(function () {
    console.debug("Dashboard deleted");

    if (superUserToken) {
      console.debug("Deleting Super User");
      return deleteSuperUser();
    }
    return Promise.resolve();
  })
  .then(function () {
    resp.success('Success');
  })
  .catch(function (error) {
    resp.error(error);
  });
}