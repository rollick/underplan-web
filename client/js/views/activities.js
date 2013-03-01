///////////////////////////////////////////////////////////////////////////////
// Activity actions

Template.activityActions.events({
  'click .new-story': function () {

    Router.setNewActivity(getCurrentGroup());
    return false;
  }
});

Template.activityActions.userBelongsToGroup = function () {
  return currentUserBelongsToCurrentGroup();
};

///////////////////////////////////////////////////////////////////////////////
// Activity editor

Template.page.showStoryEditor = function () {
  return Session.get("showStoryEditor");
};

Template.storyEditor.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.storyEditor.rendered = function() {
  $('.created').glDatePicker();
};

Template.storyEditor.defaultMapZoom = function () {
  return defaultMapZoom();
};

Template.storyEditor.events({
  'keyup .location': function (event, template) {
    var location = template.find(".location").value;
    
    if (typeof google == "object" && typeof google.maps == "object") {
      var geocoder = new google.maps.Geocoder();

      geocoder.geocode( { 'address': location }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          lat = results[0].geometry.location.Ya || results[0].geometry.location.hb;
          lng = results[0].geometry.location.Za || results[0].geometry.location.ib;

          template.find(".location-coords").innerHTML = Math.round(lat*10000)/10000 + ", " + Math.round(lng*10000)/10000 + " (" + results[0].formatted_address + ")";
        } else {
          lat = "";
          lng = "";

          template.find(".location-coords").innerHTML = "No geo match";
        }

        template.find(".lat").value = lat;
        template.find(".lng").value = lng;
      });
    } else {
      template.find(".lat").value = "";
      template.find(".lng").value = "";

      template.find(".location-coords").innerHTML = (location == "" ? "" : "Geolocation not available");
    }
  },
  'click .cancel': function (event, template) {
    Router.setGroup(getCurrentGroup());
    return false;
  },
  'click .back': function (event, template) {
    Router.setActivity(getCurrentGroup(), this);
    return false;
  },
  'click .save': function (event, template) {
    var values = getStoryValues(template);

    if (values.groupId && values.title.length && values.text.length) {
      Meteor.call('createActivity', values, function (error, activityId) {
        if (error) {
          Session.set("createError", error);
        } else {
          Router.setActivity(getCurrentGroup(), Activities.findOne(activityId));
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
    return false;
  },
  'click .update': function (event, template) {
    var activityId = template.find(".id").value;
    var values = getStoryValues(template);

    if (values.title.length && values.text.length) {
      Activities.update({_id: activityId}, {$set: values}, true, function (error) {
        if (error) {
          Session.set("createError", error);
        } else {
          Router.setActivity(getCurrentGroup(), Activities.findOne(activityId));
        }
      });
    } else {
      Session.set("createError",
                  "It needs a title and a story");
    }
  },
});

var getStoryValues = function(template) {
  values = {};

  // Latitude and Longitude
  var lat = template.find(".lat").value;
  var lng = template.find(".lng").value;

  if(lat != "" && lng != "") {
    values.lat = lat;
    values.lng = lng;
  } else {
    values.lat = values.lng = null;
  }

  // Created (Publish) Date
  var createdStr = template.find(".created").value;
  if(createdStr != "") {
    created = new Date(createdStr);
    if(created.toLocaleString() != "Invalid Date")
      values.created = created;
  }

  values.title =        template.find(".title").value;
  values.text =         template.find(".text").value;
  values.location =     template.find(".location").value;
  values.published =    template.find(".published").checked;
  values.slug =         template.find(".slug").value;
  values.picasaTags =   template.find(".picasa-tags").value;
  values.mapZoom =      template.find(".map-zoom").value;
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
// Activity map

Template.page.showActivityMap = function () {
  return Session.get("showActivityMap");
};

///////////////////////////////////////////////////////////////////////////////
// Activity feed 

Template.activityFeed.events({
  'click .feed li': function (event, template) {
    Router.setActivity(getCurrentGroup(), this);
    return false;
  },
});

Template.activityFeed.rendered = function() {
  var group = getCurrentGroup();
  var max = 16;
  
  if(group && group.picasaUsername.length && group.picasaAlbum.length) {
    $.picasa.images(group.picasaUsername, group.picasaAlbum, null, function(images) {
      var picasaAlbum = "<ul class=\"block-grid mobile-four-up\" data-clearing>";

      var index = 0;
      $.each(images, function(i, element) {
        if(index >= max)
          return false;

        picasaAlbum += " <li style=\"padding: 4px;\">";
        picasaAlbum += "   <a href=\"" + element.url + "\"><img class=\"bordered\" src=\"" + element.thumbs[0].url + "\"></a>";
        picasaAlbum += " </li>";

        index += 1;
      });
      picasaAlbum += "</ul>";
      
      $(".recent-photos").html(picasaAlbum)
      $(".recent-photos").foundationClearing();
    });
  }

  var imageUrl = recentActivitiesMap();
  $(".activities-map").html("<img class=\"bordered\" src='" + imageUrl + "' />");
};

Template.activityFeed.anyActivities = function () {
  return Activities.find({group: getCurrentGroupId()}).count() > 0;
};

Template.activityFeed.recentActivities = function () {
  return Activities.find({group: getCurrentGroupId()}, {limit: 15, sort: {created: -1}});
};

Template.activityFeed.typeIs = function (what) {
  return activityType(this) === what;
};

var recentActivitiesMap = function() {
  var dimensions = "640x240";
  var recentActivities = Activities.find({group: getCurrentGroupId()}, {limit: 15, sort: {created: -1}});

  // FIXME: The code here shouldn't ned to know about DOM elements.
  // if(parseInt($("body").css("width").match(/\d+/g)) > 767)
  //   dimensions = "300x240";

  imageUrl = "http://maps.googleapis.com/maps/api/staticmap?_=:random&sensor=false&size=:dimensions&maptype=roadmap";
  imageUrl = imageUrl.replace(/:dimensions/, dimensions).
                      replace(/:random/, Math.round((new Date()).getTime() / 1000));

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

Template.page.showActivity = function () {
  return Session.get("showActivity");
};

Template.currentActivity.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.currentActivity.anyComments = function () {
  return Comments.find({activityId: getCurrentActivityId()}).count() > 0;
};

Template.currentActivity.comments = function () {
  return Comments.find({activityId: getCurrentActivityId()}, {sort: {created: -1}});
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

Template.currentActivity.creatorName = function () {
  var owner = Meteor.users.findOne(this.owner);
  if (owner._id === Meteor.userId())
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
  if(currentActivityHasMap) {
    var dimensions = "600x240";
    var zoom = activity.mapZoom || defaultMapZoom();
    
    // FIXME: The code here shouldn't ned to know about DOM elements.
    if(parseInt($("body").css("width").match(/\d+/g)) > 767)
      dimensions = "300x240";

    imageUrl = "http://maps.googleapis.com/maps/api/staticmap?center=:lat,:lng&zoom=:zoom&size=:dimensions&maptype=roadmap&markers=color:green|label::location|:lat,:lng&sensor=false";
    imageUrl = imageUrl.replace(/:dimensions/, dimensions).
              replace(/:lat/g, activity.lat).
              replace(/:lng/g, activity.lng).
              replace(/:zoom/, zoom).
              replace(/:location/, activity.location);

    mapUrl = "http://maps.google.com/maps?t=h&q=loc::lat,:lng&z=:zoom";
    mapUrl = mapUrl.replace(/:zoom/, zoom).
              replace(/:lat/g, activity.lat).
              replace(/:lng/g, activity.lng);

    $(".activity-map").html('<a target="_blank" href="' + mapUrl + '" class="th"><img src="' + imageUrl + '"></a>');
  }

  ///////////////////////
  // Picasa Image (WIP)
  var max = 10;

  if(group && group.picasaUsername.length && currentActivityHasPhotos()) {
    $.picasa.images(group.picasaUsername, group.picasaAlbum, activity.picasaTags, function(images) {
      var picasaAlbum = "<ul class=\"block-grid eight-up\" data-clearing>";

      var index = 0;
      $.each(images, function(i, element) {
        if(index > max)
          return false;

        picasaAlbum += " <li>";
        picasaAlbum += "   <a href=\"" + element.url + "\"><img src=\"" + element.thumbs[0].url + "\"></a>";
        picasaAlbum += " </li>";

        index += 1;
      });
      picasaAlbum += "</ul>";
      
      $(".activity-photos").html(picasaAlbum)
      $(".activity-photos").foundationClearing();
    });
  }
};

Template.currentActivity.events({
  'click .edit': function () {
    Router.setEditActivity(getCurrentGroup(), this);
    return false;
  }
});

var activityBySlug = function (activitySlug) {
  return Activities.findOne({slug: activitySlug});
};

var defaultMapZoom = function () {
  return 12;
};

///////////////////////////////////////////////////////////////////////////////
// Activity comment

Template.activityComment.activity = function () {
  return Activities.findOne(getCurrentActivityId());
};

Template.activityComment.events({
  'click .save': function (event, template) {
    var comment = template.find(".comment").value;
    var activityId = template.find(".activity-id").value;
    
    if (activityId && Meteor.userId()) {
      
      Meteor.call('createComment', {comment: comment, activityId: activityId}, function (error, commentId) {
        if (error) {
          Session.set("createError", error);
        } else {
          $(template.find(".reveal-modal")).trigger('reveal:close');
          template.find(".comment").value = "";
        }
      });
    } else {
      Session.set("createError",
                  "It needs a comment");
    }

    return false;
  },
})
