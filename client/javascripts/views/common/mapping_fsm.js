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
  // NOTE: Can't be sure the google.maps libs have been loaded when
  //       intialize is called - we only want to have the reactive parts
  //       accessible as soon as initialized
  //
  initialize: function(canvasElementId) {
    logIfDev("Intializing Mapping FSM...");
    this.mapReady = false;

    var self = this;
    // Setup a trigger to set the current state as a reactive source
    self.on("transition", function () { 
      self.set("state", this.state); 
    });
  },

  // NOTE: intialize needs to be called before setup
  //
  setup: function(canvasElementId) {
    logIfDev("Intializing Google Maps...");

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

    var mapControls = $("<div class=\"map-controls\">"),
        zoomIn = $("<div class=\"zoom-in\">").click( function(event) {
          var currentZoomLevel = self.map.getZoom();
          if(currentZoomLevel != 21)
            self.map.setZoom(currentZoomLevel + 1);
        }),

        zoomOut = $("<div class=\"zoom-out\">").click( function(event) {
          var currentZoomLevel = self.map.getZoom();
          if(currentZoomLevel != 0)
            self.map.setZoom(currentZoomLevel - 1);
        }),

        mapType = $("<div class=\"map-type-toggle\">").click( function(event) {
          var type = self.map.getMapTypeId(),
              index = _.indexOf(self._mapTypes(), type),
              newIndex = (index < self._mapTypes().length - 1) ? index + 1 : 0;

          self.map.setMapTypeId(self._mapTypes()[newIndex]);
        });

        mapType.append($("<img />"));

    // add the map controls
    mapControls.append(mapType).append(zoomIn).append(zoomOut);
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(mapControls[0]);

    // setup some triggers to update the mini map
    google.maps.event.addListener(this.map, 'idle', function() {
      self._setNextMapType();
    });
    google.maps.event.addListener(this.map, 'maptypeid_changed', function() {
      self._setNextMapType();
    });

    // Setup a trigger to set the current state as a reactive source
    self.on("transition", function () { 
      self.set("state", this.state); 
    });
  },

  _mapTypes: function () {
    return _.values(google.maps.MapTypeId);
  },

  _setNextMapType: function () {
    var index = _.indexOf(this._mapTypes(), this.map.getMapTypeId()),
        nextIndex = (index < this._mapTypes().length - 1) ? index + 1 : 0,
        typeElement = $(this.map.getDiv()).find(".map-type-toggle"),
        center = this.map.getCenter();

    if (typeElement.length && center) {      
      // Set the toggle background image to the next map type
      var apiKey = appSettings.mapsApiKey;

      var imageUrl = "https://maps.googleapis.com/maps/api/staticmap?_=:random&scale=2&visible=:lat,:lng&zoom=:zoom&sensor=false&size=:dimensions&maptype=:followType"
      imageUrl = imageUrl.replace(/:dimensions/, "60x60").
                replace(/:random/, Math.round((new Date()).getTime() / 1000)).
                replace(/:zoom/, this.map.getZoom()).
                replace(/:followType/, this._mapTypes()[nextIndex]).
                replace(/:lng/g, center.ob).
                replace(/:lat/g, center.nb);

      if(apiKey != "")
        imageUrl = imageUrl + "&key=" + apiKey;

      var bgImg = typeElement.find("img");

      // Reduce the flickering when changing background image by setting the container to 
      // the previous image before setting the new image
      typeElement.css("background-image", bgImg.css("background-image")).
                  find("img").css("background-image", "url(" + imageUrl + ")");
    }
  },

  // Add a class to move map controls higher to avoid any content which might appear
  // along the bottom of the map, eg the user info from an activity
  _shiftMapControls: function (reset) {
    var controls = $(this.map.getDiv()).find(".map-controls"),
        reset = _.isUndefined(reset) ? false : true;

    if (controls) {
      if (reset)
        controls.removeClass("shift");
      else
        controls.addClass("shift");
    }
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

  _centerMarkerById: function (id, zoomLevel, offsetX, offsetY) {
    var self = this;

    for (var i = 0; i < this.markers.length; i++ ) {
      if (self.markers[i]._id == id) {
        var latLng = this.markers[i].position;

        // If the map doesn't even have a center yet then just set directly now
        if (_.isUndefined(this.map.getCenter())) {
          self.map.setCenter(latLng);
        }

        // Do some panning to the desired center
        if (offsetX || offsetY) {
          self.map.panToWithOffset(latLng, offsetX || 0, offsetY || 0);
        } else {
          self.map.panTo(latLng);
        }

        if (!!zoomLevel) {
          self.map.setZoom(parseInt(zoomLevel));
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

    return marker;
  },

  _transitions: 'webkitTransitionEnd oTransitionEnd oTransitionEnd msTransitionEnd transitionend', 

  _mapElements: function () {
    return $(".top-extra, .top-extra-handle");
  },

  _setTransitionCallback: function (callback) {
    var self = this;

    $("." + this.containerCls).one(this._transitions, function(event) {
      // resize the map if a center exists
      if (self.map.getCenter()) {
        google.maps.event.trigger(self.map, 'resize');
      } else { // otherwise set the map to a 
        self.map.setCenter(self._defaultCenter());
      }
      
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

    // If the container already has the class then just call the callback
    // if parsed and then return
    if (container.hasClass(mapCls)) {
      if (_.isFunction(callback))
        callback.call();
      return;
    }

    // Set the current height as an attribute so that css3 transition events fire
    // even if the height starts at 100% (as set by a css attribute)
    container.height(container.innerHeight()); 

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
    container.removeAttr("style").attr("class", "top-extra").addClass(mapCls);
  },

  _clearUnmatchedMarkers: function (ids) {
    var self = this,
        markersToClear = [],
        currentIds = _.pluck(this.markers, '_id');

    _.each(currentIds, function (markerId) {
      // if the marker matches an id then leave it but pop
      // the id of the ids list. If it doesn't exist then 
      // clear the marker from the map
      if (_.contains(ids, markerId))
        ids = _.without(ids, markerId);
      else
        self._clearMarkerById(markerId);
    });
  },

  _clearMarkerById: function (markerId) {
    var self = this;
        position = null;

    _.every(self.markers, function (marker, i) {
      // Unset the marker's map property and remove from list of markers
      if(marker._id === markerId) {
        marker.setMap(null);

        // Clear the data sources
        self.markers.splice(i, 1);
        self.markerData.splice(i, 1);
        self.latLngs.splice(i, 1);

        return false;
      } else {
        return true;
      }
    });
  },

  // This is meant to be run using the map state transitions, or by a part of the
  // code which is reactive as the ReactiveGroupFilter calls in the function have
  // been put inside Deps.nonreactive calls.
  setupGroupMarkers: function (forceSetup) {
    logIfDev("Loading Group Map Markers");

    // We are assuming the map is in the recentGroup state so return early if it isn't
    // NOTE: it isn't necessary to be in this state but it is currently the only time we
    //       want the map to work this way
    if (this.state !== "recentGroupIdle" && !forceSetup) return;

    var conds = ReactiveGroupFilter.get("queryFields"),
        limit = ReactiveGroupFilter.get("limit"),
        options = {sort: {created: -1}, limit: limit},
        activities = Activities.find(conds, options);

    this._setupMarkers(activities);
    this._centerMarkers(null, 0, -45);
  },

  _validLatLng: function (activity) {
    return (typeof activity.lat !== 'undefined' &&
            typeof activity.lng !== 'undefined' && 
            !_.isEmpty(activity.lat) && !_.isEmpty(activity.lng));
  },

  _defaultCenter: function () {
    return new google.maps.LatLng(11.22453, 108.822161);
  },

  _setupMarkers: function (activities, clearMarkers, callback) {
    var self = this,
        ids = [],
        success = false,
        lastActivity = null;
      
    activities.forEach( function (activity) {
      if (self._validLatLng(activity)) {
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

        success = true;
        lastActivity = activity;
      }

      ids.push(activity._id);
    });

    // trigger resize to ensure any subsequent marker centering voodoo magic works
    google.maps.event.trigger(this.map, 'resize');

    if (_.isUndefined(clearMarkers) || clearMarkers)
      this._clearUnmatchedMarkers(ids);

    if (_.isFunction(callback)) {
      callback.call(null, success, lastActivity);
    }
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

  ///////////////////////
  // States for FSM
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
        var conds = {},
            options = {limit: 25, sort: {created: -1}},
            activities = Activities.find(conds, options);

        this._setupMarkers(activities, true, function () {
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
        var conds = ReactiveGroupFilter.get("queryFields"),
            limit = ReactiveGroupFilter.get("limit"),
            options = {sort: {created: -1}, limit: limit};

        var activities = Activities.find(conds, options);

        this._setupMarkers(activities);
        this._centerMarkers();

        this.emit("FeedMapReady");
      }
    },

    showActivity: {
      _onEnter: function () {
        // don't scroll to top if last state was show activity as this might be
        // the user clicking the next / previous links. When clicking them it 
        // is more userfriendly if they can repeatedly click the links without 
        // the page scrolling to top
        if (this.priorState !== "showActivityIdle")
          $('html,body').scrollTop(0);

        // set the activityId for use in subsequent actions
        this.activityId = this.activityIdNonReactive();

        // shift map controls to make room for the activities user details
        // this._shiftMapControls();

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
        var conds = {_id: this.activityId},
            options = {}, // should only select required fields here
            activities = Activities.find(conds, options);

        // If not a success then stay in the current state => check state from something like 
        // a meteor subscribe callback and reprocess the 
        if (activities.count()) {

          this._setupMarkers(activities, clearMarkers, function (success, lastActivity) {
            if (success) {
              // If there is a lastActivity then use it's zoom level
              var zoomLevel = (lastActivity && lastActivity.mapZoom) ? lastActivity.mapZoom : null;

              self._centerMarkerById(self.activityId, zoomLevel, 0, -25);
            }

          });

          // Transition to showActivityIdle so that subsequent transitions to showActivity
          // will trigger the handlers in this state.
          this.transition("showActivityIdle");

        } else {
          this.transition("showActivityWaiting");
        }
      }
    },

    // Enter this state to indicate the activity record hasn't been found when the expected.
    showActivityWaiting: {},

    showActivityIdle: {
      _onEnter: function () {
        this.emit("ActivityMapReady");
      },
      _onExit: function() {
        // unselect all markers by calling without id
        this._selectMarkerById();

        // reset map control to usual position
        // this._shiftMapControls(true);
      },
    },

    showEditor: {
      _onEnter: function () {
        $('html,body').scrollTop(0);
        this.activityId = this.activityIdNonReactive();

        this.handle("map.default");
      },
      "map.default": function() {
        var self = this;

        this._setContainerClass('default', function () {
          self.handle("marker.selected");
        });
      },
      "marker.selected": function() {
        if (this.activityId) {
          var marker = this._selectMarkerById(this.activityId);

          // No marker found. Maybe arrived here directly or from a template
          // without a map. Sooo, add the marker for the activity.
          if (!marker) {
            var self = this;
            this._setupMarkers(Activities.find({_id: this.activityId}), false, function () {
              // center on marker
              self._centerMarkerById(self.activityId);

              self.emit("EditorMapReady");
            });
          } else {
            this.emit("EditorMapReady");
          }
        } else {
          // set default map center
          this.map.setCenter(this._defaultCenter());
          this.map.setZoom(12);

          this.emit("EditorMapReady");
        }
      },
    },

    showSettings: {
      _onEnter: function () {
        this.handle("map.hide");
      },
      _onExit: function () {
        this._mapElements().removeClass("hide");

        google.maps.event.trigger(this.map, 'resize');

        this.emit("MapVisible");
      },
      "map.hide": function() {
        var self = this;
        this._setTransitionCallback(function () {
          self._mapElements().addClass("hide");
        });
        this._setContainerClass('hidden');

        this.emit("SettingsMapReady");
      }
    },

    hideMap: {
      _onEnter: function () {
        this.handle("map.hide");
      },
      _onExit: function () {
        this._mapElements().removeClass("hide");

        google.maps.event.trigger(this.map, 'resize');

        this.emit("MapVisible");
      },
      "map.hide": function() {
        var self = this;
        this._setTransitionCallback(function () {
          self._mapElements().addClass("hide");
        });
        this._setContainerClass('hidden');

        this.emit("MapHidden");
      }
    },

    showLocationCreator: {
      _onEnter: function () {
        $('html,body').scrollTop(0);

        this.handle("map.default");
      },
      "map.default": function() {
        var self = this;

        // Set the map class and then center map on last activity for the 
        // currently set group if any have been fetched
        this._setContainerClass('default', function () {
          var ids = Session.get("activityIdsSorted"),
              gLatLng = self._defaultCenter();

          if (ids.length) {
            var activity = Activities.findOne(_.last(ids));

            if (self._validLatLng(activity)) {
              var gLatLng = new google.maps.LatLng(activity.lat, activity.lng)
            }
          }

          self.map.setCenter(gLatLng);
          self.map.setZoom(12);
        });

        this.emit("LocationCreatorReady");
      }
    }
  },

  ///////////////////////
  // Reactive Component of FSM - TBC
  // _stateDependency: null,

  equals: function (key, value) {
    this._ensureStateDependency();

    if (key === "state") {
      this._stateDependency.depend();
      
      return this.state === value;
    } else {
      throw("Could not find matching key in MappingFSM"); 
    }
  },

  get: function() {
    this._ensureStateDependency();

    this._stateDependency.depend();
    if (this.state)
      return this.state;
  },

  set: function (state) {
    this._ensureStateDependency();

    if (!_.isEqual(state, this.state)) {
      this._stateDependency.changed();
    }
  },

  _ensureStateDependency: function () {
    if (!this._stateDependency) {
      this._stateDependency = new Deps.Dependency;
    }
  }
});