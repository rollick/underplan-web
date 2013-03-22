///////////////////////////////////////////////////////////////////////////////
// Activity editor

Template.storyEditor.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.storyEditor.defaultMapZoom = function () {
  return defaultMapZoom();
};

Template.storyEditor.events({
  'keyup .location': function (event, template) {
    var location = template.find(".location").value;

    if(!(location.length > 3))
      return false;
    
    if (timeout) {  
      clearTimeout(timeout);
    }
    timeout = setTimeout(function() {
      console.log("Geolocating: " + location);
      coords = geoLocation(location, function(geo) {
        if(typeof geo === "object") {
          var lat = geo.lat,
              lng = geo.lng,
              address = geo.address;

          template.find("#lat").value = lat;
          template.find("#lng").value = lng;

          template.find("#location-coords").innerHTML = Math.round(lat*10000)/10000 + ", " + Math.round(lng*10000)/10000 + " (" + address + ")";
        } else {
          template.find("#lat").value = "";
          template.find("#lng").value = "";

          template.find("#location-coords").innerHTML = (location == "" ? "" : "Geolocation failed!");      
        }
      });
    }, 750);

  },
  'click .cancel': function (event, template) {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .back': function (event, template) {
    Router.setActivity(this);
    return false;
  },
  'click .save': function (event, template) {
    var values = getStoryValues(template);

    if (values.groupId && values.title.length && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error);
        } else {
          Router.setActivity(activityId);
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
    $(document).scrollTop(0);

    return false;
  },
  'click .update': function (event, template) {
    var activityId = template.find("#_id").value;
    var values = getStoryValues(template);

    if (values.title.length && values.text.length) {
      Activities.update({_id: activityId}, {$set: values}, true, function (error) {
        if (error) {
          Session.set("createError", error);
        } else {
          Router.setActivity(Activities.findOne(activityId));
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
    $(document).scrollTop(0);

    return false;
  },
});

var getStoryValues = function(template) {
  values = {};

  // Latitude and Longitude
  var lat = template.find("#lat").value;
  var lng = template.find("#lng").value;

  if(lat != "" && lng != "") {
    values.lat = lat;
    values.lng = lng;
  } else {
    values.lat = values.lng = null;
  }

  // Created (Publish) Date
  var day = template.find(".day-picker .current").text;
  var month = template.find(".month-picker .current").text;
  var year = template.find(".year-picker .current").text;
  var created = new Date(day + " " + month + " " + year);

  if(created.toLocaleString() != "Invalid Date")
    values.created = created; 
     
  // var createdStr = template.find(".created").value;
  // if(createdStr != "") {
  //   created = new Date(createdStr);
  //   if(created.toLocaleString() != "Invalid Date")
  //     values.created = created;
  // }

  values.title =        template.find("#title").value;
  values.text =         template.find("#text").value;
  values.location =     template.find("#location").value;
  values.published =    template.find("#published").checked;
  values.slug =         template.find("#slug").value;
  values.picasaTags =   template.find("#picasa-tags").value;
  values.mapZoom =      template.find("#map-zoom").value;
  values.groupId =      getCurrentGroupId();

  return values;
}

Template.storyEditor.error = function () {
  return Session.get("createError");
};

var hideActivityEditor = function() {
  Session.set("showActivityMap", true);
  Session.set("showStoryEditor", false);
};

///////////////////////////////////////////////////////////////////////////////
// Activity feed 

Template.activityFeed.events({
  'click .story a': function (event, template) {
    Router.setActivity(this);
    return false;
  },
  'click .new-short a': function (event, template) {
    $(".short-form.row").show();
    return false;
  }
});

Template.activityFeed.rendered = function() {
  var group = getCurrentGroup();
  var max = 16;
  var options = {gridSmall: 4, gridLarge: 6};
  
  if(group && group.picasaUsername.length && group.picasaAlbum.length) {
    $.picasa.images(group.picasaUsername, group.picasaAlbum, null, function(images) {
      var photos = []
      var index = 0;

      $.each(images, function(i, element) {
        if(index >= max)
          return false;

        photos.push({
          url: element.url, 
          thumbUrl: element.thumbs[0].url,
          caption: element.title
        });

        index += 1;
      });
      
      $(".recent-photos").html(Template.picasaGallery($.extend({photos: photos}, options)));
      // FIXME: implement new clearing code
      $(".recent-photos").foundation("clearing");
    });
  }

  // google.maps.event.addListener(map, 'tilesloaded', _.bind(function() {
    generateActivitesMap(group, ".activities-map:visible");
    // google.maps.event.clearListeners(map, 'tilesloaded');
  // }, this));
};

Template.activityFeed.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

Template.activityFeed.anyActivities = function () {
  return Activities.find({group: getCurrentGroupId()}).count() > 0;
};

Template.activityFeed.recentActivities = function () {
  return Activities.find({group: getCurrentGroupId()}, {sort: {created: -1}});
};

Template.activityFeed.typeIs = function (what) {
  return this.type === what;
};

var dashboardMap = dashboardMapBounds = null;

var generateActivitesMap = function(group, elementSelector) {
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

  var locations = [];
  var index = 1;
  var icons = {
    short: "http://maps.google.com/mapfiles/marker.png",
    story: "http://maps.google.com/mapfiles/marker_green.png"
  }

  var activities = Activities.find({group: group._id}).forEach( function (activity) {
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
}

///////////////////////////////////////////////////////////////////////////////
// Activity view

Template.currentActivity.nextActivity = function () {
  return Activities.find({
    $and: [
      {group: getCurrentGroupId()},
      {"_id": {"$not": getCurrentActivityId()}}, 
      {type: "story"}, 
      {created: {"$gte": getCurrentActivity().created}}
    ]
  }, {sort: {created: 1, _id: 1}}).fetch()[0];
};

Template.currentActivity.previousActivity = function () {
  return Activities.find({
    $and: [
      {group: getCurrentGroupId()},
      {"_id": {"$not": getCurrentActivityId()}}, 
      {type: "story"}, 
      {created: {"$lte": getCurrentActivity().created}}
    ]
  }, {sort: {created: -1, _id: -1}}).fetch()[0];
};

Template.currentActivity.group = function () {
  return getCurrentGroup();
};

Template.currentActivity.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.currentActivity.hasPhotos = function () {
  return currentActivityHasPhotos();
};

Template.currentActivity.hasMap = function () {
  return currentActivityHasMap();
};

Template.currentActivity.anyActivities = function () {
  return Activities.find().count() > 0;
};

Template.currentActivity.anyComments = function () {
  var activity = getCurrentActivity();

  return Comments.find({activityId: activity._id}).count() > 0;
};

Template.currentActivity.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if(!owner)
    return "";

  if(owner._id === Meteor.userId())
    return "me";

  return displayName(owner);
};

Template.currentActivity.canRemove = function () {
  return this.owner === Meteor.userId();
};

Template.currentActivity.canEdit = function () {
  return this.owner === Meteor.userId();
};

Template.currentActivity.rendered = function() {
  var group = getCurrentGroup();
  var activity = getCurrentActivity();

  ///////////////////////
  // Google Map
  if(activity && currentActivityHasMap) {
    var dimensions = "600x240";
    var zoom = activity.mapZoom || defaultMapZoom();
    var apiKey = appSettings().mapsApiKey;
    
    // FIXME: The code here shouldn't ned to know about DOM elements.
    if(parseInt($("body").css("width").match(/\d+/g)) > 767)
      dimensions = "300x240";

    imageUrl = "http://maps.googleapis.com/maps/api/staticmap?center=:lat,:lng&zoom=:zoom&size=:dimensions&maptype=roadmap&markers=color:green|label::location|:lat,:lng&sensor=false";
    imageUrl = imageUrl.replace(/:dimensions/, dimensions).
              replace(/:lat/g, activity.lat).
              replace(/:lng/g, activity.lng).
              replace(/:zoom/, zoom).
              replace(/:location/, activity.location);

    if(apiKey != "")
      imageUrl = imageUrl + "&key=" + apiKey;

    mapUrl = "http://maps.google.com/maps?t=h&q=loc::lat,:lng&z=:zoom";
    mapUrl = mapUrl.replace(/:zoom/, zoom).
              replace(/:lat/g, activity.lat).
              replace(/:lng/g, activity.lng);

    $(".activity-map").html('<a target="_blank" href="' + mapUrl + '" class="th"><img src="' + imageUrl + '"></a>');
  }

  ///////////////////////
  // Picasa Image (WIP)
  var options = {gridLarge: 10, gridSmall: 4};

  if(group && group.picasaUsername.length && currentActivityHasPhotos()) {
    $.picasa.images(group.picasaUsername, group.picasaAlbum, activity.picasaTags, function(images) {
      var photos = []
      var index = 0;

      $.each(images, function(i, element) {
        photos.push({
          url: element.url, 
          thumbUrl: element.thumbs[0].url,
          caption: element.title
        });

        index += 1;
      });
      
      $(".activity-photos").html(Template.picasaGallery($.extend({photos: photos}, options)));

      // FIXME: implement new clearing code
      $(".activity-photos").foundation("clearing");
    });
  }
};

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(getCurrentGroup(), this);
    return false;
  },
  'click .new-comment a': function (event, template) {
    Session.set("createError", null);
    
    $(event.target).closest("a").toggleClass("disabled");
    $(".comment-form.row").toggle();
    return false;
  },
  'click .activity-controls a': function (event, template) {
    Router.setActivity(this);
    return false;
  }
});

var activityBySlug = function (activitySlug) {
  return Activities.findOne({slug: activitySlug});
};

var defaultMapZoom = function () {
  return 12;
};
