///////////////////////////////////////////////////////////////////////////////
// Activity feed 

var feedLimitSkip = 5;
var dashboardMap = null;
var dashboardMapBounds = null;

Template.activityFeed.helpers({
  feedTitle: function() {
    text = "All Activities";
    if (!Template.feedList.feedLimitReached()) {
      text = "Last " + Session.get("feedLimit") + " Activities";
    }

    // larger displays
    var html = "<h4 class=\"hide-for-small\">";
    html += Template.feedList.feedLimitReached() ? "All Activities" : "Last " + Session.get("feedLimit") + " Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h4>";

    var h5Style = "wide";
    if (Session.get("feedLimit") > 9) {
      h5Style = "wider";
    }

    // small displays
    html += "<h4 class=\"show-for-small " + h5Style + "\">Last " + Session.get("feedLimit") + "</h4>";

    html += "<h5 class=\"show-for-small " + h5Style + "\">Activities";
    if (Template.feedList.moreActivities()) {
      html += "<span class=\"sub-header\"><a href=\"#\" class=\"feed-all\">Show all</a></span>";
    }
    html += "</h5>";

    return new Handlebars.SafeString(html);
  }
});

Template.activityFeed.events({
  'click .story a': function (event, template) {
    Router.setActivity(this);
    return false;
  },
  'click .new-short': function (event, template) {
    $(".short-form.row").show().find("textarea").focus();
    return false;
  },
  "click .new-story": function () {
    Router.setNewActivity(getCurrentGroup());
    return false;
  },
  "click a.feed-all": function () {
    Session.set("feedLimit", Template.activityFeed.activityCount() + 1);
    return false;
  },
  "click .country-filter a": function (event, template) {
    var filterElem = $(template.find(".country-filter"));
    var selected = event.target.text;
    var filter = {group: Session.get("groupId")}; 
    var targetElem = $(event.target);

    // set filter
    if(! targetElem.hasClass("all")) {
      $.extend(filter, {country: targetElem.text()});
    }
    Session.set("feedFilter", filter);
    Session.set("feedLimit", feedLimitSkip);

    return false;
  }
});

// Template.activityFeed.created = function () {
//   console.log("Created Activity Feed Template");
//   Session.setDefault("feedLimit", feedLimitSkip);
//   Session.setDefault("feedFilter", {});
// };


Template.activityFeed.rendered = function() {
  var filter = Session.get("feedFilter");
  Session.set("feedFilter", $.extend(filter, {group: Session.get("groupId")}));

  var group = getCurrentGroup();
  var max = 24;
  var options = {gridSmall: 4, gridLarge: 6, element: ".recent-photos"};
  
  if(group && group.picasaUsername.length && group.picasaAlbum.length) {
    $.picasa.images(group.picasaUsername, group.picasaAlbum, group.picasaKey, null, function(images) {
      var photos = []
      var index = 0;

      $.each(images, function(i, element) {
        if(index >= max)
          return false;

        photos.push({
          url: element.versions[0].url, 
          thumbUrl: element.thumbs[0].url,
          caption: element.title
        });

        index += 1;
      });
      
      renderPicasaPhotos(photos, options);
    });
  }
  
  var recentActivities = [];
  if(!!Session.get("feedFilter").group) {
    recentActivities = Activities.find(Session.get("feedFilter"), {sort: {created: -1}, limit: Session.get("feedLimit")});
  }

  generateActivitesMap(group, ".activities-map:visible", recentActivities);

  // google.maps.event.addListener(map, 'tilesloaded', _.bind(function() {
    // generateActivitesMap(group, ".activities-map:visible");
    // google.maps.event.clearListeners(map, 'tilesloaded');
  // }, this));
};

Template.activityFeed.loading = function () {
  return _.isNull(activitiesSubscription) || !activitiesSubscription.ready();
};

Template.activityFeed.destroyed = function () {
  // console.log("Destroyed Activity Feed Template");
  // Session.set("feedLimit", null);
  // Session.set("feedFilter", null);
};

Template.activityFeed.picasaGalleryUrl = function () {
  var group = getCurrentGroup();
  var picasaPath = [group.picasaUsername, group.picasaAlbum].join("/");

  if(group.picasaKey)
    picasaPath += "?authkey=" + group.picasaKey;

  return "https://picasaweb.google.com/" + picasaPath;
};

Template.activityFeed.countries = function () {
  var countries = [];

  Activities.find({group: Session.get("groupId")}).forEach( function(activity) {
    if(typeof activity.country === "string" && activity.country.length) {
      countries.push(activity.country);
    }
  });

  return _.uniq(countries).sort();
};

Template.activityFeed.showCountryFilter = function () {
  return Template.activityFeed.countries().length > 1;
};

Template.activityFeed.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

Template.activityFeed.activityCount = function () {
  return Activities.find(Session.get("feedFilter")).count();
};

Template.activityFeed.totalActivities = function () {
  return Activities.find(Session.get("feedFilter")).count();
}

///////////////////////////////////////////////////////////////////////////////
// Activity feed list

Template.feedList.events({
  "click .feed-more a": function () {
    Session.set("feedLimit", Session.get("feedLimit") + feedLimitSkip);
    return false;
  },
})

Template.feedList.anyActivities = function () {
  return Template.activityFeed.activityCount() > 0;
};

Template.feedList.recentActivities = function () {
  // never return activities without a group
  if(!!Session.get("feedFilter").group) {
    return Activities.find(Session.get("feedFilter"), {sort: {created: -1}, limit: Session.get("feedLimit")});
  } else {
    return [];
  }
};

Template.feedList.feedLimitReached = function () {
  return Session.get("feedLimit") >= Activities.find(Session.get("feedFilter")).count();
};

// FIXME: this is a hack! Should be able to use "unless" feedLimitReached in template
//        but it only seems to work for a single reference.
Template.feedList.moreActivities = function() {
  return Session.get("feedLimit") < Activities.find(Session.get("feedFilter")).count();
};

Template.feedList.typeIs = function (what) {
  return this.type === what;
};

///////////////////////////////////////////////////////////////////////////////
// Common Functions

var recentActivitiesMap = function() {
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

var generateActivitesMap = function(group, elementSelector, activities) {
  // load default group if only string passed to function
  if(typeof group === "string" && typeof elementSelector === "undefined") {
    group = getCurrentGroup();
  } else if(typeof elementSelector === "undefined" && typeof elementSelector === "undefined") {
    console.log("No group or container element defined!");
    return false;
  }

  if(!_.isObject(group)) {
    console.log("No current group defined!");
    return false;
  }

  var element = $(elementSelector)[0];
  if(typeof element === "undefined")
    return false;

  if(typeof activities === "undefined")
    activities = Activities.find({group: group._id});

  var locations = [];
  var index = 1;
  var icons = {
    short: "http://maps.google.com/mapfiles/marker.png",
    story: "http://maps.google.com/mapfiles/marker_green.png"
  }

  activities.forEach( function (activity) {
    var lat = parseFloat(activity.lat);
    var lng = parseFloat(activity.lng);

    if(!isNaN(lat) && !isNaN(lng)) {
      var text = "";
      if(activity.type == "short")
        text = activity.text;

      locations.push(
        {
          lat: activity.lat, 
          lng: activity.lng, 
          text: text, 
          type: activity.type, 
          activityId: activity._id, 
          index: index
        }
      );
      index+=1;
    }
  });

  dashboardMap = new google.maps.Map(element, {
    mapTypeId: google.maps.MapTypeId.ROADMAP
  });

  dashboardMapBounds = new google.maps.LatLngBounds();
  var infowindow = new google.maps.InfoWindow();

  var marker, i;

  for (i = 0; i < locations.length; i++) {  
    var latLng = new google.maps.LatLng(locations[i].lat, locations[i].lng);

    marker = new google.maps.Marker({
      position: latLng,
      map: dashboardMap,
      icon: icons[locations[i].type]
    });

    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        var location = locations[i];
        var activity = Activities.findOne(location.activityId);

        if(location.type === "story") {
          Router.setActivity(activity);
        } else {
          var html = Template.shortContent(activity);
          html = "<div class=\"map-info\">" + html + "</div>";

          infowindow.setContent(html);
          infowindow.open(dashboardMap, marker);
        }
      }
    })(marker, i));

    dashboardMapBounds.extend(latLng);
  }
  dashboardMap.fitBounds(dashboardMapBounds);
};