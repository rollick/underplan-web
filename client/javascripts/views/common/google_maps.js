gmaps = {
    // map object
    map: null,
 
    // google markers objects
    markers: [],
 
    // google lat lng objects
    latLngs: [],
 
    // our formatted marker data objects
    markerData: [],

    clearMarkers: function () {
      for (var i = 0; i < this.markers.length; i++ ) {
        this.markers[i].setMap(null);
      }
      this.markers = [];

      this.markerData = [];
      this.latLngs = [];
    },

    addMarker: function(marker) {
      mapIconUrl = "http://mt.google.com/vt/icon?psize=27&font=fonts/Roboto-Bold.ttf&color=ff135C13&name=icons/spotlight/%s&ax=43&ay=50&text=•&scale=2";

      mapIconsByType = {
        short: {
          url: mapIconUrl.replace("%s", "spotlight-waypoint-a.png"),
          scaledSize: new google.maps.Size(20, 35)
        },
        story: {
          url: mapIconUrl.replace("%s", "spotlight-waypoint-b.png"),
          scaledSize: new google.maps.Size(20, 35)
        }
      }

      var gLatLng = new google.maps.LatLng(marker.lat, marker.lng);
      var gMarker = new google.maps.Marker({
        position: gLatLng,
        map: this.map,
        title: marker.title,
        // animation: google.maps.Animation.DROP,
        icon: mapIconsByType[marker.type]
      });
      this.latLngs.push(gLatLng);
      this.markers.push(gMarker);
      this.markerData.push(marker);

      google.maps.event.addListener(gMarker, 'click', (function(marker) {
        return function() {
          var activity = Activities.findOne(marker.id);

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
      })(marker));

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

      var mapOptions = {
        zoom: 12,
        scrollwheel: false, // to allow page scrolling, not map zooming
        // center: new google.maps.LatLng(53.565, 10.001),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        
        panControl: false,
        zoomControl: true,
        zoomControlOptions: {
          style: google.maps.ZoomControlStyle.SMALL,
          position: google.maps.ControlPosition.LEFT_TOP
        },
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: google.maps.ControlPosition.RIGHT_TOP
        },
      };

      var canvas = document.getElementById('map-canvas');
      // $(".map").css({"border": "red solid 2px"});

      this.map = new google.maps.Map(
        document.getElementById('map-canvas'),
        mapOptions
      );

      // Add a blank div as custom control to push zoom controls 
      // and layers down and away from top nav bars
      var fakeControl = $(document.createElement("div"));
      fakeControl.css("height", navHeight());
      fakeControl.css("width", 30);
      this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(fakeControl[0]);
      this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(fakeControl.clone()[0]);

      // global flag saying we intialized already
      Session.set('feedMap', true);
    }
}