/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;
const Cc = Components.classes;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyServiceGetter(Services, "embedlite",
                                    "@mozilla.org/embedlite-app-service;1",
                                    "nsIEmbedAppService");

XPCOMUtils.defineLazyServiceGetter(Services, "uuidgenerator",
                                    "@mozilla.org/uuid-generator;1",
                                    "nsIUUIDGenerator");

const kEntities = { "geolocation": "geolocation",
                    "desktop-notification": "desktopNotification" };

function ContentPermissionPrompt() {}

ContentPermissionPrompt.prototype = {
  classID: Components.ID("{C6E8C44D-9F39-4AF7-BCC0-76E38A8310F5}"),

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPermissionPrompt, Ci.nsIEmbedMessageListener]),
  _pendingRequests: {},

  _getRandomId: function() {
    return Services.uuidgenerator.generateUUID().toString();
  },

  handleExistingPermission: function handleExistingPermission(request) {
    let result = Services.perms.testExactPermissionFromPrincipal(request.principal, request.type);
    if (result == Ci.nsIPermissionManager.ALLOW_ACTION) {
      request.allow();
      return true;
    }
    if (result == Ci.nsIPermissionManager.DENY_ACTION) {
      request.cancel();
      return true;
    }
    return false;
  },

  onMessageReceived: function(messageName, message) {
    dump("ContentPermissionPrompt.js on message received: top:" + messageName + ", msg:" + message + "\n");
    var ret = JSON.parse(message);
    // Send Request
    if (!ret.id) {
        dump("request id not defined in response\n");
        return;
    }
    let request = this._pendingRequests[ret.id];
    if (!request) {
        dump("Wrong request id:" + ret.id + "\n");
        return;
    }

    Services.embedlite.removeMessageListener("embedui:premissions", this);
    let entityName = kEntities[request.type];
    if (ret.allow) {
      // If the user checked "Don't ask again", make a permanent exception
      if (ret.checkedDontAsk) {
        Services.perms.addFromPrincipal(request.principal, request.type, Ci.nsIPermissionManager.ALLOW_ACTION);
      } else if (entityName == "desktopNotification") {
        // For notifications, it doesn't make sense to grant permission once. So when the user clicks allow,
        // we let the requestor create notifications for the session.
        Services.perms.addFromPrincipal(request.principal, request.type, Ci.nsIPermissionManager.ALLOW_ACTION,
                                        Ci.nsIPermissionManager.EXPIRE_SESSION);
      }
      request.allow();
    } else {
        // If the user checked "Don't ask again", make a permanent exception
        if (ret.checkedDontAsk)
          Services.perms.addFromPrincipal(request.principal, request.type, Ci.nsIPermissionManager.DENY_ACTION);
        request.cancel();
    }
    delete this._pendingRequests[ret.id];
  },

  prompt: function(request) {
    // Returns true if the request was handled
    if (this.handleExistingPermission(request))
       return;

    let entityName = kEntities[request.type];

    dump("idleTime: json:" + Services.embedlite + "\n");
    Services.embedlite.addMessageListener("embedui:premissions", this);
    var winid = Services.embedlite.getIDByWindow(request.window);
    let uniqueid = this._getRandomId();
    Services.embedlite.sendAsyncMessage(winid, "embed:permissions", JSON.stringify({title: entityName, host: request.principal.URI.host, id: uniqueid}));
    this._pendingRequests[uniqueid] = request;
  }
};

//module initialization
this.NSGetFactory = XPCOMUtils.generateNSGetFactory([ContentPermissionPrompt]);
