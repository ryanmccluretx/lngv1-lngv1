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

function tempSuperUser(req, resp) {
  const params = req.params;

  console.debug(req);

  // Execute createSuperUser service
  ClearBladeAsync.Code().execute("createSuperUser", {
    "email": "iacomponentr@clearblade.com",
    "first_name": "IA",
    "last_name": "Component",
    "password": "iauserpassword",
    "group_ids": [
      "default"
    ]
  }, true)
  .then(function(response) {
    console.debug("Returned from createSuperUser")
    console.debug(response);

    if (!response.success) {
      resp.error("Failed to execute createSuperUser service: " + JSON.stringify(response.results));
      return;
    }

    if (!response.results.user_id) {
      resp.error("Failed to get user_id from createSuperUser response");
      return;
    }

    console.debug("Updating user");

    // Make PUT request to set service account flag
    return fetch("https://" + cbmeta.platform_url + "/admin/user/" + req.systemKey + "?user=" + response.results.user_id, {
        "headers": {
          "accept": "*/*",
          "clearblade-devtoken": req.userToken,
          "content-type": "text/plain;charset=UTF-8",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        },
        "body": JSON.stringify({
          "changes": {
            "cb_service_account": true
          },
          "user": response.results.user_id
        }),
        "method": "PUT",
        "mode": "cors",
        "credentials": "include"
      });
  })
  .then(function(response) {
    console.debug("Returned from updating user");
    console.debug(response);

    if (!response.ok) {
      throw new Error("Failed to update user: " + response.statusText);
    }

    console.debug("typeof response.body = " + (typeof response.body));

    if (response.body && Object.keys(response.body).length > 0) {
      console.debug("Invoking response.json()");
      return response.json();
    }
    return Promise.resolve("");
  })
  .then(function(response) {
    log("User updated successfully: " + JSON.stringify(response));
    resp.success("Super user created and service account flag set successfully");
  })
  .catch(function(error) {
    resp.error("Error creating and updating super user: " + JSON.stringify(error));
  });
}
