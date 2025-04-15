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

  // Execute createSuperUser service
  var codeService = ClearBlade.Code();
  codeService.execute("createSuperUser", {
    "email": "iacomponentr@clearblade.com",
    "first_name": "IA",
    "last_name": "Component",
    "password": "iauserpassword",
    "group_ids": [
      "default"
    ]
  }, true, function (err, data) {
    if (err) {
      resp.error("Failed to execute createSuperUser service: " + JSON.stringify(err));
      return;
    }

    try {
      // The data might already be parsed, so we need to handle both cases
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const userId = parsedData.results.user_id;
      
      if (!userId) {
        resp.error("Failed to get user_id from createSuperUser response");
        return;
      }

      // Make PUT request to set service account flag
      fetch("https://demo.clearblade.com/admin/user/" + req.systemKey + "?user=" + userId, {
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
          "user": userId
        }),
        "method": "PUT",
        "mode": "cors",
        "credentials": "include"
      })
        .then(function(response) {
          if (!response.ok) {
            throw new Error("Failed to update user: " + response.statusText);
          }
          return response.json();
        })
        .then(function(responseData) {
          log("User updated successfully: " + JSON.stringify(responseData));
          resp.success("Super user created and service account flag set successfully");
        })
        .catch(function(error) {
          resp.error("Failed to update user: " + JSON.stringify(error));
        });
    } catch (parseErr) {
      resp.error("Failed to parse createSuperUser response: " + JSON.stringify(parseErr));
    }
  });
}
