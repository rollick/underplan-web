function ImageMarker( id, options ) {
  this.setValues( options );
  this.set("_id", id);
  
  this.$inner = $("<div class='inner'>");

  this.$div = $("<div class='map-marker " + options.type + "'>")
    .append(this.$inner)
    .append($("<div class='tick'>"))
    .css({
      position: "absolute",
      display: "none"
    });
};

function initMapExtras() {
  ImageMarker.prototype = new google.maps.OverlayView;

  ImageMarker.prototype.onAdd = function() {
    $( this.getPanes().overlayMouseTarget ).append( this.$div );
  };

  ImageMarker.prototype.onRemove = function() {
    this.$div.remove();
  };

  ImageMarker.prototype.draw = function() {
    var marker = this;
    var projection = this.getProjection();
    var position = projection.fromLatLngToDivPixel( this.get("position") );

    var profileHeight = parseInt(this.$inner.css("height")),
        tickHeight = parseInt(this.$inner.siblings(".tick").css("height"));

    this.$div.css({
      left: position.x,
      top: position.y - profileHeight - tickHeight, // minus profile and tick heights
      display: "block"
    }).attr("id", "marker-" + this.get("_id"));

    var img = $("<img src='" + this.get("image") + "'/>");

    this.$inner
      // .css("background", "url(" + this.get("image") + ")")
      .html(img)
      .click( function( event ) {
        var events = marker.get("events");
        events && events.click( event, marker );
      })
  };

  google.maps.Map.prototype.panToWithOffset = function(latlng, offsetX, offsetY) {
    var map = this;
    var ov = new google.maps.OverlayView();
    ov.onAdd = function() {
        var proj = this.getProjection();
        var aPoint = proj.fromLatLngToContainerPixel(latlng);
        aPoint.x = aPoint.x+offsetX;
        aPoint.y = aPoint.y+offsetY;
        map.panTo(proj.fromContainerPixelToLatLng(aPoint));
    }; 
    ov.draw = function() {}; 
    ov.setMap(this); 
  };
}

MappingFsm = machina.Fsm.extend({
  log: function (msg) {
    msg = !!msg ? msg : "";
    logIfDev("MappingFsm [" + this.state + "]: " + msg);
  },
  map: null,
  mapReady: null,
  // google markers objects
  markers: [],
  // google lat lng objects
  latLngs: [],
  // our formatted marker data objects
  markerData: [],
  defaultZoom: 12,
  defaultTimerId: null,
  containerCls: "top-extra",
  activityIdNonReactive: function() {
    return Deps.nonreactive(function () { 
      return ReactiveGroupFilter.get("activity");
    });
  },

  clearMarkers: function () {
    for (var i = 0; i < this.markers.length; i++ ) {
      this.markers[i].setMap(null);
    }
    this.markers = [];

    this.markerData = [];
    this.latLngs = [];
  },

  addMarker: function(marker) {
    var gLatLng = new google.maps.LatLng(marker.lat, marker.lng);
    var gMarker = new ImageMarker(marker.id, {
      map: this.map,
      position: gLatLng,
      image: marker.image,
      type: marker.type,
      events: {
        click: function( event, marker ) {
          // get the activity _id from the element id
          var parts = $(event.target).closest(".map-marker").attr('id').match(/.*-([a-z|0-9]+)/i);
          if (!parts) {
            throw("Marker Activity ID not found on marker!");
          }

          var activity = Activities.findOne(parts[1]);

          // Now load the activity
          if(activity) {
            if(activity.type === "story") {
              Router.setActivity(activity);            
            } else {
              Router.setPermaActivity(activity);
            }
          } else {
            if (isDev)
              throw("Crash! Bang!");
          }

          return false;
        }
      }
    });

    this.latLngs.push(gLatLng);
    this.markers.push(gMarker);
    this.markerData.push(marker);

    return gMarker;
  },

  bounds: function () {
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0, latLngLength = this.latLngs.length; i < latLngLength; i++) {
      bounds.extend(this.latLngs[i]);
    }

    return bounds;
  },

  // calculate and move the bound box based on our markers
  calcBounds: function() {
    this.map.fitBounds(this.bounds());
  },

  // check if a marker already exists
  markerExists: function(key, val) {
    var match = false
    _.each(this.markerData, function(storedMarker) {
      if (storedMarker[key] == val) {
        match = true;
      }
    });
    return match;
  },

  // initialize the map
  initialize: function(canvasElementId) {
    logIfDev("Intializing Google Maps...");
    this.mapReady = false;

    if (!canvasElementId)
      canvasElementId = "map-canvas";

    // Once we initialize this we can/should be sure the google maps
    // lib has loaded so we can extend some mapping code
    initMapExtras();

    var mapOptions = {
      zoom: this.defaultZoom,
      scrollwheel: false, // to allow page scrolling, not map zooming
      // center: new google.maps.LatLng(53.565, 10.001),
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      
      streetViewControl: false,
      panControl: false,
      zoomControl: false,
      zoomControlOptions: {
        style: google.maps.ZoomControlStyle.SMALL,
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      },
      mapTypeControl: false,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.RIGHT_TOP
      },
    };

    this.map = new google.maps.Map(
      document.getElementById(canvasElementId),
      mapOptions
    );

    var self = this;
    google.maps.event.addListenerOnce(this.map, "idle", function() {
      self.mapReady = true;
      self.processTransitionQueue();
    });

    google.maps.event.addListener(this.map, "dragstart", function () {
      $(this.getDiv()).closest(".map").addClass("panning");
    });
    google.maps.event.addListener(this.map, "dragend", function () {
      $(this.getDiv()).closest(".map").removeClass("panning");
    });

    // Add a blank div as custom control to push zoom controls 
    // and layers down and away from top nav bars
    var fakeControl = $("<div class=\"fake-control\">");
    fakeControl.css("height", "45px");
    fakeControl.css("width", "30px");
    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(fakeControl[0]);
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(fakeControl.clone()[0]);

    var zoomControl = $("<div class=\"map-zoom-controls\">"),
        zoomIn = $("<div class=\"zoom-in\">").click( function(event) {
          var currentZoomLevel = self.map.getZoom();
          if(currentZoomLevel != 21)
            self.map.setZoom(currentZoomLevel + 1);
        }),
        zoomOut = $("<div class=\"zoom-out\">").click( function(event) {
          var currentZoomLevel = self.map.getZoom();
          if(currentZoomLevel != 0)
            self.map.setZoom(currentZoomLevel - 1);
        });

    zoomControl.append(zoomIn).append(zoomOut);

    this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(zoomControl[0]);      
  },

  // Pan bounds to fit in map and then pan again to make the bounds centered
  // TODO: my best effort to smooth(-ishly) center markers.
  _centerMarkers: function (callback, offsetX, offsetY) {
    var bounds = this.bounds();

    this.map.fitBounds(bounds);

    if (offsetX || offsetY) {
      this.map.panBy(offsetX || 0, offsetY || 0);
    }
    
    google.maps.event.addListenerOnce(this.map, 'idle', function() {
      if (_.isFunction(callback))
        callback.call();
    });
  },

  _centerMarkerById: function (id, offsetX, offsetY) {
    for (var i = 0; i < this.markers.length; i++ ) {
      if (this.markers[i]._id == id) {
        var latLng = this.markers[i].position;
        if (offsetX || offsetY) {
          this.map.panToWithOffset(latLng, offsetX || 0, offsetY || 0);
        } else {
          this.map.panTo(latLng);
        }
        break;
      }
    }
  }, 

  _selectMarkerById: function (id) {
    var marker = null;

    for (var i = 0; i < this.markers.length; i++ ) {
      if (this.markers[i]._id == id) {
        marker = this.markers[i];
        break;
      }
    }

    if (marker) {
      var mapDiv = $(marker.map.getDiv());
      // Remove selected class from all markers
      mapDiv.find(".map-marker").removeClass("selected");

      $(marker.$div).addClass("selected");
    }
  },

  _transitions: 'webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', 

  _setTransitionCallback: function (callback) {
    var self = this;

    $("." + this.containerCls).one(this._transitions, function(event) {
      google.maps.event.trigger(self.map, 'resize');
      
      if (_.isFunction(callback)) {
        callback.call();
      }

      // var newHeight = $(element).css("height");
      // self.map.panBy(0, (parseInt(oldHeight) - parseInt(newHeight)) / 2); 
      self._cancelTransitionCallback();
    });
  },

  _cancelTransitionCallback: function () {
    // Clear the transitions as, for example, webkit will trigger 
    // webkitTransitionEnd and transitionend
    $("." + this.containerCls).off(this._transitions);    
  },

  _setContainerClass: function (mapCls, callback) {
    var container = $("." + this.containerCls),
        oldHeight = container.height(),
        self = this;

    // Remove height which could be added be dragging map handle
    container.removeAttr("style");

    // If the container already has the class then just call the callback
    // if parsed and then return
    if (container.hasClass(mapCls)) {
      if (_.isFunction(callback))
        callback.call();
      return;
    }

    // This won't work unless the the new class added as mapCls 
    // actually causes a transition (change in height) => make sure
    // if the map class needs to be a non-standard one then it should
    // set a different.
    //
    // FIXME: if the the mapCls is different to the existing class but
    //        changing it doesn't cause one of the css transitions below
    //        then we need a way to still trigger the code in the .one 
    //        handler for the container. Any ideas??
    //        ... Trying to use a timer to catch cases where there is no
    //        transition to trigger. See setTimer at end of function.
    this._setTransitionCallback(callback);

    // Remove all classes except top-extra and then add new class
    container.removeClass(function(i, cls) {
      var list = cls.split(' ');
      return  list.filter(function(val) {
        return (val != self.containerCls);
      }).join(' ');
    }).addClass(mapCls);
  },

  _clearUnmatchedMarkers: function (ids) {
    // TODO: add this so that it can be used in setupMarkers rather than just 
    //       removing all markers and then possibly readding the some back
  },

  // This is meant to be run using the map state transitions, or by a part of the
  // code which is reactive as the ReactiveGroupFilter calls in the function have
  // been put inside Deps.nonreactive calls.
  setupGroupMarkers: function (forceSetup) {
    // We are assuming the map is in the recentGroup state so return early if it isn't
    // NOTE: it isn't necessary to be in this state but it is currently the only time we
    //       want the map to work this way
    if (this.state !== "recentGroupIdle" && !forceSetup) return;

    var conds = Deps.nonreactive(function () { 
      return ReactiveGroupFilter.get('queryFields');
    });

    var limit = Deps.nonreactive(function () { 
      return ReactiveGroupFilter.get("limit");
    });
    var options = {sort: {created: -1}, limit: limit};

    this._setupMarkers(conds, options);
    this._centerMarkers(null, 0, -45);
  },

  _setupMarkers: function (conds, options, clearMarkers, callback) {
    var recentActivities = Activities.find(conds, options).fetch(),
        self = this;

    // TODO: create clearUnmatchedMarkers. For now just call clearMarkers
    //   
    // var ids = _.map(recentActivities, function(activity){ return activity._id; });
    // this._clearUnmatchedMarkers(ids);
    if (_.isUndefined(clearMarkers) || clearMarkers)
      this.clearMarkers();

    if (recentActivities.length > 0) {
      _.each(recentActivities, function(activity) {
        if (typeof activity.lat !== 'undefined' &&
            typeof activity.lng !== 'undefined') {

          var objMarker = {
            id: activity._id,
            lat: activity.lat,
            lng: activity.lng,
            type: activity.type,
            image: userPicture(Meteor.users.findOne(activity.owner), 90)
          };

          // check if marker already exists
          if (!self.markerExists('id', objMarker.id)) {
            self.addMarker(objMarker);
          }
        }
      });
    }

    if (_.isFunction(callback))
      callback.call();
  },

  // Use this if the map might not be ready before the passed 
  // function needs to be called. 
  // func can be just a function (one argument), or a function and 
  // a scope (two arguments)
  queueOrRun: function (func /* .. scope */) {
    var params = Array.prototype.slice.call(arguments),
        scope = null;

    if (params.length > 1) { 
      func = params[0];
      scope = params[1];
    }

    // Map not ready so add this function and scope to the queue
    if (!this.mapReady) {
      this.transitionQueue.push({func: func, scope: scope});
    } else {
      func.call(scope);
    }
  },

  processTransitionQueue: function () {
    var self = this, 
        item = null;

    if (this.mapReady) {
      while (item = this.transitionQueue.pop()) {
        item.func.call(item.scope || self);
      }
      return true;
    }
    return false;
  },

  // Array of hashes with {func: <some function>, scope: <optional scope>} to 
  // be called and then cleared when mapReady is set to true in initialize
  transitionQueue: [],

  // valid states. access with transition("<state>")
  states: {
    uninitialized: {
      _onEnter: function() {
        this.emit( "MapReady" );
        // this.transition("recentAll");
      }
    },
    recentAll: {
      _onEnter: function() {
        $('html,body').scrollTop(0);

        this.queueOrRun(function() { this.handle("map.home"); }, this);
      },
      "map.home": function() {
        // Set map class to home
        var self = this;
        this._setContainerClass('home', function () {
          self.handle("markers.load");
        });
      },
      "markers.load": function() {
        var self = this;
        // Load the markers for the last 25 activities
        this.log("Render Home Map...");

        // Clear the markers if returning to the home page
        // this.clearMarkers();

        this._setupMarkers({}, {limit: 25, sort: {created: -1}}, null, function () {
          self._centerMarkers(null, 0, -45);
        });

        this.emit("HomeMapReady");
      }
    },

    recentGroup: {
      _onEnter: function () {
        $('html,body').scrollTop(0);
        this.queueOrRun(function() { this.handle("map.fullscreen"); }, this);
      },
      "map.fullscreen": function() {
        var self = this;
        // Set map class to fullscreen
        this._setContainerClass('fullscreen', function () {
          self.handle("markers.load");
        });
      },
      "markers.load": function() {
        this.setupGroupMarkers(true);

        this.transition("recentGroupIdle");
      }
    },

    recentGroupIdle: {
      _onEnter: function () {
        this.emit("GroupMapReady");
      }
    },

    recentFeed: {
      _onEnter: function () {
        $('html,body').scrollTop(0);
        this.queueOrRun(function() { this.handle("map.hide"); }, this);
      },
      "map.hide": function() {
        // Set map class to small
        var self = this;
        this._setContainerClass('hide', function () {
          self.handle("markers.load");
        });
      },
      "markers.load": function() {
        var conds = Deps.nonreactive(function () { 
          return ReactiveGroupFilter.get('queryFields');
        });

        var limit = Deps.nonreactive(function () { 
          return ReactiveGroupFilter.get("limit");
        });
        var options = {sort: {created: -1}, limit: limit};

        this._setupMarkers(conds, options);
        this._centerMarkers();

        this.emit("FeedMapReady");
      }
    },

    showActivity: {
      _onEnter: function () {
        $('html,body').scrollTop(0);
        // set the activityId for use in subsequent actions
        this.activityId = this.activityIdNonReactive();

        this.handle("map.default");
      },
      "map.default": function() {
        var self = this;
        this._setContainerClass('default', function () {
          // Select marker
          self.handle("marker.selected");
        });
      },
      "marker.selected": function() {
        this._selectMarkerById(this.activityId);
        this.handle("marker.load");
      },
      "marker.load": function() {
        var self = this;

        // Clear activities if the previous state was the home page
        var clearMarkers = (this.priorState === "recentAll");

        // TODO: should we queue the setup markers below as the activityId might not
        //       be set yet. Then in a deps autorun we can process the map queue once
        //       the activity id has been set...
        this._setupMarkers({_id: this.activityId}, {}, clearMarkers, function () {
          self._centerMarkerById(self.activityId, 0, -45);
        });

        // Transition to showActivityIdle so that subsequent transitions to showActivity
        // will trigger the handlers in this state.
        this.transition("showActivityIdle");
      }
    },

    showActivityIdle: {
      _onEnter: function () {
        this.emit("ActivityMapReady");
      },
      _onExit: function() {
        // unselect all markers by calling without id
        this._selectMarkerById();
      },
    }
  }
});