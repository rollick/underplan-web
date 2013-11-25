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

createMapObject = function () {
  var mapObject = {
    // map object
    map: null,

    mapReady: false,

    // google markers objects
    markers: [],

    // google lat lng objects
    latLngs: [],

    // our formatted marker data objects
    markerData: [],

    defaultZoom: 12,

    defaultTimerId: null,

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
          click: function( event ) {
            var activityId = $(event.target).attr('id');
            var activity = Activities.findOne(activityId);

            if(activity) {
              if(activity.type === "story") {
                Router.setActivity(activity);            
              } else {
                Router.setPermaActivity(activity);
              }
            } else {
              if (isDev)
                console.log("Crash! Bang!");
            }
          }
        }
      });

      this.latLngs.push(gLatLng);
      this.markers.push(gMarker);
      this.markerData.push(marker);

      return gMarker;
    },

    // calculate and move the bound box based on our markers
    calcBounds: function() {
      var bounds = new google.maps.LatLngBounds();
      for (var i = 0, latLngLength = this.latLngs.length; i < latLngLength; i++) {
        bounds.extend(this.latLngs[i]);
      }
      
      this.map.fitBounds(bounds);
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
    initialize: function() {
      logIfDev("Intializing Google Maps...");

      this.initMapMarker();

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

      var canvas = document.getElementById("map-canvas");
      // $(".map").css({"border": "red solid 2px"});

      this.map = new google.maps.Map(
        document.getElementById("map-canvas"),
        mapOptions
      );

      var self = this;
      google.maps.event.addListenerOnce(this.map, "idle", function() {
        self.mapReady = true;
      });

      google.maps.event.addListener(this.map, "dragstart", function () {
        $(gmaps.map.getDiv()).closest(".map").addClass("panning");
      });
      google.maps.event.addListener(this.map, "dragend", function () {
        $(gmaps.map.getDiv()).closest(".map").removeClass("panning");
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
          });;

      zoomControl.append(zoomIn).append(zoomOut);

      this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(zoomControl[0]);

      // global flag saying we intialized already
      Session.set('activityMap', true);
    },

    initMapMarker: function () {
      ImageMarker.prototype = new google.maps.OverlayView;

      ImageMarker.prototype.onAdd = function() {
        $( this.getPanes().overlayMouseTarget ).append( this.$div );
      };

      ImageMarker.prototype.onRemove = function() {
        this.$div.animate({opacity: 0}, 500).remove();
      };

      ImageMarker.prototype.draw = function() {
        var marker = this;
        var projection = this.getProjection();
        var position = projection.fromLatLngToDivPixel( this.get("position") );

        this.$div.css({
          left: position.x,
          top: position.y - 45 - 10, // minus profile and tick heights
          display: "block",
          opacity: 0
        }).animate({opacity: 1.0}, 500);

        var img = $("<img src='" + this.get("image") + "'/>");

        this.$inner
          .html(img)
          .attr("id", this.get("_id"))
          .click( function( event ) {
            var events = marker.get("events");
            events && events.click( event );
          })
      };
    }
  }

  return mapObject;
}