//
// HateBUZZ   - tweet Hatebu users about current page -
//
window.HateBUZZ = (function() {

    // CONFIGURATION ///////////////////////////////////////////////////////////
    const DEBUG = true;
    const config = {
      MAX_ITEMS:  5,
      BUZZ_ONCE:  true,
      DELAY:      3   // sec.
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

            var cachedData = evalInSandbox(getValue(this.url));
            debug("cached : " + cachedData);

            if (cachedData) {
                debug("Hit the cached content : " + this.url);
                debug(cachedData);
                debug(cachedData.bookmarks.toSource());
                pickupCommentsUpto(config.MAX_ITEMS, cachedData.bookmarks, proc);
                setValue(currentURL(), cachedData.toSource());
                return;
            }

            debug("Cache not exists. so request to host:" + this.url);
            var that = this;
            xmlhttpRequest({
                method: "GET",
                url: "http://b.hatena.ne.jp/entry/json/"+ this.url,
                onload: function(data) {
                    debug("onload!!!!!!!");
                    debug(data.responseText);
                    var json = evalInSandbox(data.responseText);

                    if (!json.bookmarks) return;
                    debug("json: " + json.bookmarks);

                    pickupCommentsUpto(config.MAX_ITEMS, json.bookmarks, proc);
                    setValue(that.url, json.toSource());
                }
            });
        }
    };

    // Growler object (singleton)
    const Growler = (function() {

      if (navigator.platform == 'Win32' && isGrowlInstalled()) {
        // for Windows
        let growl = Components.classes['@growlforwindows.com/growlgntp;1']
                    .getService().wrappedJSObject;
        growl.register(
          'HateBUZZ',
          'http://www.hatena.ne.jp/images/top/side_b.gif',
          [{name: 'notify', displayName: 'notify'}]
        );
        return {
          notify: function(title, text, iconURL) {
            growl.notify( 'HateBUZZ', 'notify', title, text, iconURL);
          }
        };
      }
      else {
        // for Mac
        let alertService = Components.classes["@mozilla.org/alerts-service;1"]
                          .getService(Components.interfaces.nsIAlertsService);
        return {
          notify: function(title, text, iconURL) {
            alertService.showAlertNotification(iconURL, title, text);
          }
        };
      }

      function isGrowlInstalled()
        Application.extensions.has('growlgntp@brian.dunnington');

      return {
        notify: function(){}
      };
    })();


    // PRIVATE /////////////////////////////////////////////////////////////////

    function evalInSandbox(exp) {
      var result = null;
      try {
        result = Components.utils.evalInSandbox(exp, Components.utils.Sandbox(content));
      } catch(ex) { }
      return result;
    }

    function setValue(url, value) {
      debug(<>##### {url} ##### {(value || '').substring(0, 10)} #####</>);
      globalStorage[url]['HateBUZZ'] = value;
    }

    function getValue(url)
      (globalStorage[url]['HateBUZZ'] || {value: null}).value;

    function resetValue(url)
      setValue(url, null);

    function xmlhttpRequest(options) {
      let req = new XMLHttpRequest();
      req.open(options.method, options.url, true);
      req.onreadystatechange = function(event) {
        if (req.readyState == 4 &&
            req.status == 200) {
          options.onload(req);
        }
      };
      req.send(null);
    }


    function currentURL() {
        return window.content.location.href;
    }

    function pickupCommentsUpto(count, arr, func) {
        arr = config.BUZZ_ONCE ? arr : arrayCopy(arr);
        if (!arr) return;

        for(var i = 0; arr.length > 0 && i < count;) {
            var index = Math.floor(Math.random() * arr.length);
            var pick = (arr.splice(index, 1))[0];
            if (pick.comment.length == 0) {
                debug(<>{pick.user} -- skip this!!!</>);
                continue;
            }
            setTimeout(func, i++ * 1000, pick);
        }
    }

    function arrayCopy(arr) {
        return arr.slice();
    }

    function debug(msg) {
        DEBUG && (msg instanceof XML
            ? dump("$$$ debug $$$: " + msg.toString() + "\n")
            : dump("$$$ debug $$$: " + msg + "\n")
        );
    }

  const self = {
    hatebu: {},

    buzz: function(url) {
      this.hatebu = new Hatebu(url);
      this.hatebu.eachBookmark(function(bookmark) {
          Growler.notify(
            bookmark.user,
            bookmark.comment,
            Hatebu.getUserIcon(bookmark.user)
          );
      });
    },

    setValue: setValue,
    getValue: getValue,
    clearCache: resetValue,
    evalInSandbox: evalInSandbox,
    config: config
  }
  return self;
})();

// regster event
getBrowser().addEventListener("load", function(event) {
  let doc = event.originalTarget;
  if (!doc.location) return;

  let href = doc.location.href;

  if (!(doc instanceof HTMLDocument)) return;
  if (doc.defaultView.frameElement) return;
  if (href.match(/^about/)) return;

  window.setTimeout(
    function(href) {
      HateBUZZ.buzz(href);
    },
    HateBUZZ.config.DELAY * 1000,
    href
  );
}, true);

