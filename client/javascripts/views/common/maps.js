///////////////////////////////////////////////////////////////////////////////
// Common Functions

activityStaticMap = function(activity) {
  if(!activity.lat || !activity.lng) {
    return "";
  }

  var dimensions = "720x240";
  var apiKey = appSettings().mapsApiKey;

  imageUrl = "http://maps.googleapis.com/maps/api/staticmap?_=:random&zoom=:zoom&sensor=false&size=:dimensions&maptype=roadmap&visible=:lat,:lng&markers=color:green|label::label|:lat,:lng";
  imageUrl = imageUrl.replace(/:dimensions/, dimensions).
                      replace(/:random/, Math.round((new Date()).getTime() / 1000)).
                      replace(/:zoom/, _.isNumber(parseInt(activity.mapZoom)) ? activity.mapZoom : 12).
                      replace(/:lng/g, activity.lng).
                      replace(/:lat/g, activity.lat).
                      replace(/:label/, activity.location);

  if (apiKey != "")
    imageUrl = imageUrl + "&key=" + apiKey;

  // get correct dpi image
  imageUrl = imageUrl + "&scale=" + window.devicePixelRatio;

  return imageUrl;
};

recentActivitiesMap = function() {
  var dimensions = "640x240";
  var recentActivities = Activities.find({group: getCurrentGroupId()}, {limit: 100, sort: {created: -1}});
  var apiKey = appSettings().mapsApiKey;

  // FIXME: The code here shouldn't need to know about DOM elements.
  if(parseInt($("body").css("width").match(/\d+/g)) > 767)
    dimensions = "640x400";

  imageUrl = "http://maps.googleapis.com/maps/api/staticmap?_=:random&sensor=false&size=:dimensions&maptype=roadmap";
  imageUrl = imageUrl.replace(/:dimensions/, dimensions).
                      replace(/:random/, Math.round((new Date()).getTime() / 1000));

  if(apiKey != "")
    imageUrl = imageUrl + "&key=" + apiKey;

  recentActivities.forEach(function (activity) {
    if(activity.lat && activity.lng) {
      imageUrl += "&visible=:lat,:lng&markers=color:green|label::label|:lat,:lng";
      imageUrl = imageUrl.replace(/:lng/g, activity.lng).
                          replace(/:lat/g, activity.lat).
                          replace(/:label/, activity.location);
    }
  });

  return imageUrl;
};

///////////////////////////////////////////////////////////////////////////////
// Activity Map

gmaps = null;
mapTypes = ["feed", "home"];

Template.activityMap.created = function () {
  Session.set('activityMap', false);

  gmaps = createMapObject();
}

Template.activityMap.rendered = function() {
  var type = "feed";
  if (_.intersection([this.data], mapTypes).length)
    type = this.data;
    
  setupMap(type);

  $('.feed-handle').draggable({
    axis: 'y', 
    containment: [ 0, 150, 9999, 500 ],
    helper: 'clone',
    start: function(){
        var $this = $(this);
        $this.data('start-top', $this.position().top);
        $this.data('last-top', $this.position().top);
    },
    drag: function (event, ui) { 
      var $this = $(this);
      var height = ui.offset.top; 
      $(this).prev().height(height);

      if (!!gmaps && gmaps.mapReady && !_.isUndefined(gmaps.map.getCenter())) {
        gmaps.map.panBy(0, ($this.data('last-top') - height) / 2);
        google.maps.event.trigger(gmaps.map, 'resize');        
      }

      $this.data('last-top', height);
    }
  });
};

Template.activityMap.destroyed = function() {
  logIfDev("Destroying Google Maps...");
  Session.set('activityMap', false);
  // gmaps = null;
};

setupMap = function (type) {
  check(type, String);

  logIfDev("Inner Map Rendered...");
  
  if (Session.equals('activityMap', false))
    gmaps.initialize();

  Deps.autorun(function(computation) {
    if (isDev()) {
      computation.onInvalidate(function() {
        console.trace();
      });
    }

    var conds = null;
    var options = null;
    if (type === "feed") {
      logIfDev("Render Feed Map...");
      conds = ReactiveFeedFilter.get('queryFields');
      options = {sort: {created: -1}};
    }
    else if (type === "home") {
      logIfDev("Render Home Map...");
      conds = {};
      options = {limit: 25, sort: {created: -1}};
    }

    logIfDev("Autorun Map Deps...");

    var recentActivities = Activities.find(conds, options).fetch();
    gmaps.clearMarkers();
  
    if (recentActivities.length > 0) {
      logIfDev("Processing Map Data...");

      _.each(recentActivities, function(activity) {
        if (typeof activity.lat !== 'undefined' &&
            typeof activity.lng !== 'undefined') {

          var objMarker = {
            id: activity._id,
            lat: activity.lat,
            lng: activity.lng,
            type: activity.type
          };

          // check if marker already exists
          if (!gmaps.markerExists('id', objMarker.id)) {
            gmaps.addMarker(objMarker);
          }
        }
      });
      gmaps.calcBounds();
      gmaps.map.panBy(0, -50);
    }
  });
}