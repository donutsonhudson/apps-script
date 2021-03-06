function respondToJoinFormSubmit(e) {
  var addonTitle = 'My Add-on Title'
  var props = PropertiesService.getDocumentProperties()
  var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL)

  // Check if the actions of the trigger requires authorization that has not
  // been granted yet; if so, warn the user via email. This check is required
  // when using triggers with add-ons to maintain functional triggers.
  if (authInfo.getAuthorizationStatus() ==
      ScriptApp.AuthorizationStatus.REQUIRED) {
    // Re-authorization is required. In this case, the user needs to be alerted
    // that they need to re-authorize; the normal trigger action is not
    // conducted, since it requires authorization first. Send at most one
    // "Authorization Required" email per day to avoid spamming users.
    var lastAuthEmailDate = props.getProperty('lastAuthEmailDate');
    var today = new Date().toDateString()
    if (lastAuthEmailDate != today) {
      if (MailApp.getRemainingDailyQuota() > 0) {
        var html = HtmlService.createTemplateFromFile('AuthorizationEmail')
        html.url = authInfo.getAuthorizationUrl()
        html.addonTitle = addonTitle
        var message = html.evaluate()
        MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
            'Authorization Required',
            message.getContent(), {
                name: addonTitle,
                htmlBody: message.getContent()
            }
        )
      }
      props.setProperty('lastAuthEmailDate', today);
    }
  } else {
    // Authorization has been granted, so continue to respond to the trigger.
    
    //get sheetname from config
    var sheet = SpreadsheetApp.getActiveSheet()
    var sheetName = sheet.getName()
    for (var key in config.networks) {
      var network = config.networks[key]
      if (network.nodes === sheetName) {
       var thisSheet = sheet
      }
    }
    
    // This logs the value in the very last cell of this sheet
    var lastRow = thisSheet.getLastRow() -1
    
    //get question fields by column header name
    //colName cannot contain spaces
    var node = lastRow
    var name = getByName("Name", lastRow)
    var email = getByName("Email", lastRow)
    var phone = getByName("Phone", lastRow)
    var location = getByName("Location", lastRow)
    var rooftop = getByName("Rooftop Access", lastRow)
    var ncl = getByName("I agree to the Network Commons License", lastRow)
    var timestamp = getByName("Timestamp", lastRow)
    var id = getByName("ID", lastRow)
    
    Logger.log("name pre-check: " + name)
    //set blank name to email
    if (name === undefined){
      name = email
    }
    //var values = sheetName.getRange(lastRow, 1, 1, 3).getValues(); // returns 2d array
    //values.forEach(function(row){
    //  Logger.log('email: ' + email)
    //})
    
    //build email subject
    if (rooftop === "I have Rooftop access") {
      rooftop = "Rooftop install"
      var emailTitle = "NYC Mesh Rooftop Install " + lastRow
    } else {
      rooftop = "Standard install"
      var emailTitle = "NYC Mesh Install " + lastRow
    }
      
    //set field values
    var message = "timestamp: " + timestamp + "\r\n"
    message += "node: " + id + "\r\n"
    message += "name: " + name + "\r\n"
    message += "email: " + email + "\r\n"
    message += "phone: " + phone + "\r\n"
    message += "location: " + location + "\r\n"
    message += "rooftop: " + rooftop + "\r\n"
    message += "agree to ncl: " + ncl
    var subject = emailTitle
    
    
    //json setup for post
    var url = "https://support.nycmesh.net/api/http.php/tickets.json"
    var data = {
      "node": id,
      "userNode": id,
      "email": email,
      "name": name,
      "subject": subject, 
      "message": message,
      "phone": phone,
      "location": location,
      "rooftop": rooftop,
      "ncl": ncl,
      "ip": "*.*.*.*"
    };
    var payload = JSON.stringify(data)
    
    var header = {
      "X-API-Key": config.osticket.APIKey
    };

    var options = {
      "method":"POST",
      "headers": header,
      "muteHttpExceptions": true,
      "payload": payload
    };
    
    try {
      //osticket api call
      var response = UrlFetchApp.fetch(url, options)
      
      //API error reporting
      if (/API/.test(response)) {    //regex search
          MailApp.sendEmail(config.osticket.Admin,
                    'API Error - New Node - osticket.gs',
                    'API problem: ' + response);
      } 
    //general exception reporting
    } catch (e) {
        MailApp.sendEmail(config.osticket.Admin,
                    'Error caught - New Node: osticket.gs',
                    e);
    }
    
    //str = JSON.stringify(options, null, 4)
    //Logger.log('options' + str)
    //str = JSON.stringify(payload, null, 4)
    //Logger.log('payload: ' + str)
    //Logger.log("\n\r")
    //Logger.log(response)

  }
}


//calls value per column header name
//colName cannot contain spaces
function getByName(colName, row) {
  var sheet = SpreadsheetApp.getActiveSheet()
  var data = sheet.getDataRange().getValues()
  var col = data[0].indexOf(colName)
  if (col != -1) {
    Logger.log(colName + ': ' + data[row-1][col])
    return data[row-1][col]
  }
}
