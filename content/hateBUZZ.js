// need this?
window.HateBUZZ = (function() {

    // CONFIGURATION ///////////////////////////////////////////////////////////
    const DEBUG = true;
    const config = {
      MAX_ITEMS:  5,
      BUZZ_ONCE:  true,
      DELAY:      3,   // sec.
      USER:       "snaka72"
    }

    // CLASS  /////////////////////////////////////////////////////////////////
    function Hatebu(url) {
        this.url = url;
    }

    Hatebu.getUserIcon = function(user) {
        return "http://www.hatena.ne.jp/users/" + user.substr(0, 2) + "/" + user + "/profile.gif";
    };

    Hatebu.prototype = {
        eachBookmark: function(proc) {
            debug("Hatebu#eachBookmark");

            var cachedData = eval(getValue(currentURL(), null));
            if (cachedData) {
                debug("Hit the cached content : " + currentURL());
                this._processForBookmarks(cachedData.bookmarks, proc);
                setValue(currentURL(), cachedData.toSource());
                return;
            }

            debug("Cache not exists. so request to host:" + currentURL());
            var that = this;
            xmlhttpRequest({
                method: "GET",
                url: "http://b.hatena.ne.jp/entry/json/"+ currentURL(),
                onload: function(data) {
                    debug("onload!!!!!!!");
                    var sandBox = new Components.utils.Sandbox("about:blank");
                    var json = Components.utils.evalInSandbox(data.responseText, sandBox);

                    //debug(data.responseText);
                    //var json = window.eval(data.responseText);
                    //var json = JSON.parse(data.responseText);
                    debug(json);

                    if (!json.bookmarks) return;
                    debug("json: " + json.bookmarks);

                    that._processForBookmarks(json.bookmarks, proc);
                    setValue(currentURL(), json.toSource());
                }
            });
        },

        _processForBookmarks: function(bookmarks, proc) {
            shuffle(config.MAX_ITEMS, bookmarks, function(bookmark) {
                if (bookmark.comment.length > 0) {
                    proc(bookmark);
                }
            });
        }
    };

    // PRIVATE /////////////////////////////////////////////////////////////////

    function setValue(name, value)
      globalStorage[currentURL()][name] = value;

    function getValue(name)
      globalStorage[currentURL()][name];

    function xmlhttpRequest(options) {
      let req = new XMLHttpRequest();
      req.open(options.method, options.url, true);
      req.onreadystatechange = function(event) {
        debug("readystatecahnge:" + req.readyState);
        debug("status " + req.status);
        if (req.readyState == 4 &&
            req.status == 200) {
          options.onload(req);
        }
      };
      req.send(null);
    }

    const alertService = Components.classes["@mozilla.org/alerts-service;1"]
                          .getService(Components.interfaces.nsIAlertsService);

    function notify(title, text, iconURL) {
      alertService.showAlertNotification(iconURL, title, text);
    }

    function currentURL() {
        return window.content.location.href;
    }

    function shuffle(count, arr, func) {
        arr = config.BUZZ_ONCE ? arr : arrayCopy(arr);
        if (!arr) return;

        for(var i = 0; arr.length > 0 && i < count;) {
            var index = Math.floor(Math.random() * arr.length);
            var pick = (arr.splice(index, 1))[0];
            if (pick.comment.length == 0)
                continue;
            setTimeout(func, i++ * 1000, pick);
        }
    }

    function arrayCopy(arr) {
        return arr.slice();
    }

    function debug(msg) {
        DEBUG && dump("$$$ debug $$$: " + msg + "\n");
    }

  getBrowser().addEventListener("load", function(event) {
      let doc = event.originalTarget;

      if (!(doc instanceof HTMLDocument)) return;
      if (doc.defaultView.frameElement) return;
      if (currentURL().match(/^about/)) return;

      window.setTimeout(function() {
        HateBUZZ.buzz(doc.location.href);
      }, config.DELAY * 1000);

      debug("--- setTimeout: " + currentURL());
  }, true);

  const self = {
    hatebu: {},

    buzz: function() {
      debug("@@@ HateBUZZ.buzz");
      this.hatebu = new Hatebu(config.USER);
      this.hatebu.eachBookmark(function(bookmark) {
          notify(
            bookmark.user,
            bookmark.comment,
            Hatebu.getUserIcon(bookmark.user)
          );
      });
    },

    setValue: setValue,
    getValue: getValue,
  }
  return self;
})();
