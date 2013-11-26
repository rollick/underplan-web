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
                      replace(/:zoom/, (!!parseInt(activity.mapZoom) ? activity.mapZoom : 12)).
                      replace(/:lng/g, activity.lng).
                      replace(/:lat/g, activity.lat).
                      replace(/:label/, encodeURIComponent(activity.location));

  if (apiKey != "")
    imageUrl = imageUrl + "&key=" + apiKey;

  // get correct dpi image
  imageUrl = imageUrl + "&scale=" + window.devicePixelRatio;

  return imageUrl;
};

recentActivitiesMap = function() {
  var dimensions = "640x240";
  var recentActivities = Activities.find({group: ReactiveGroupFilter.get("group")}, {limit: 100, sort: {created: -1}});
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
// Main Map

Template.mainMap.events({
  "click .load-more": function (event, template) {
    ReactiveGroupFilter.set("limit", ReactiveGroupFilter.get("limit") + feedLimitSkip);
    return false;
  }
});

Template.mainMap.helpers({
  // count of activities shown on map is either the current set "limit", or the activities
  // count if it is less than the "limit", eg all activities have been fetched
  activityCountControl: function () {
    var groupId = ReactiveGroupFilter.get("group");
    var total = Activities.find(ReactiveGroupFilter.get('queryFields'), {_id: 1}).count();
    var limit = ReactiveGroupFilter.get("limit") || 0;

    limit = total < limit ? total : limit;
 
    var classNames = "",
        linkText = "";

    if (limit < total) {
      classNames = "load-more";
      linkText = "Load More";
    } else {
      classNames = "load-more disabled";
      linkText = "Complete";
    }

    var container = $("<div />").addClass(classNames);
    var link = $("<a />").attr("href", "#").html(linkText + " (" + limit + "/" + total + ")");
    var html = $('<div>').append(container.append(link));

    return new Handlebars.SafeString(html.html());
  },
  showCountControl: function () {
    return !!ReactiveGroupFilter.get("group");
  }
});

Template.mainMap.rendered = function () {
  logIfDev("++ Rendered main map: " + JSON.stringify(this.data));
};

///////////////////////////////////////////////////////////////////////////////
// Activity Map

gmaps = null;
mapTypes = ["feed", "home", "activity"];
mapDepComputation = null; 

Template.activityMap.created = function () {
  Session.set('activityMap', false);

  gmaps = createMapObject();
}

Template.activityMap.rendered = function() {
  logIfDev("++ Rendered Activity Map...");

  setupMap();

  $('.top-extra-handle').draggable({
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
  Session.set('activityMap', false);
  
  if (!!mapDepComputation) {
    mapDepComputation.stop();
    mapDepComputation = null;
  }
};

setupMap = function () {
  if (Session.equals('activityMap', false))
    gmaps.initialize();

  mapDepComputation = Deps.autorun(function(computation) {
    if (isDev()) {
      computation.onInvalidate(function() {
        console.trace();
      });
    }

    // wrap some vars in Deps.nonreactive as a change in them will also be
    // reflected in the queryFields reactive field => don't want this code 
    // to run multiple times. 
    var conds = null,
        options = null,
        group = Deps.nonreactive( function () { return ReactiveGroupFilter.get("group") }),
        activity = Deps.nonreactive( function () { return ReactiveGroupFilter.get("activity") }),
        type = _.isNull(activity) ? (_.isNull(group) ? "home" : "feed") : "activity";

    if (type === "feed") {
      logIfDev("Render Feed Map...");
      conds = ReactiveGroupFilter.get('queryFields');
      options = {sort: {created: -1}, limit: ReactiveGroupFilter.get("limit")};
    } else if (type === "home") {
      logIfDev("Render Home Map...");
      conds = {};
      options = {limit: 25, sort: {created: -1}};
    } else if (type === "activity") {
      conds = {_id: activity};
      options = {};
    }
    
    var recentActivities = Activities.find(conds, options).fetch();
    gmaps.clearMarkers();
  
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
          if (!gmaps.markerExists('id', objMarker.id)) {
            gmaps.addMarker(objMarker);
          }
        }
      });
      gmaps.calcBounds();

      if (type === "feed" || type === "home") {
        gmaps.map.panBy(0, -50);
      }
      
      if (type === "activity" && recentActivities[0].mapZoom){
        gmaps.map.setZoom(parseInt(recentActivities[0].mapZoom));
      }
    }
  });
}