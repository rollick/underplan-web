// Underplan -- client
Meteor.subscribe("activities");
Meteor.subscribe("allComments");
Meteor.subscribe("allGroups");
Meteor.subscribe("directory");

///////////////////////////////////////////////////////////////////////////////
// Templates

var appTemplates = function () {
  return {
    groupInviteList: "showInviteList", 
    currentActivity: "showActivity", 
    storyEditor: "showStoryEditor", 
    groupEditor: "showGroupEditor",
    activityMap: "showActivityMap",
    mainHome: "showGroupList",
    userSettings: "showUserSettings",
    loginForm: "showLoginForm",
    mainSettings: "showMainSettings"
  };
}

var showTemplate = function (templateName) {
  var conditions = appTemplates();
  
  _.each(_.keys(conditions), function(key) {
    if(key === templateName) {
      Session.set(conditions[key], true);
    } else {
      Session.set(conditions[key], false);
    }
  });
};

// var initTemplateChecks = function() {
//   var conditions = appTemplates();

//   _.each(_.keys(conditions), function(key) {
//     var value = conditions[key];
//     Template.page[value] = function () {
//       return Session.get(value);
//     };
//   });
// };

Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showGroupEditor = function () {
  return Session.get("showGroupEditor");
};

Template.page.showActivityMap = function () {
  return Session.get("showActivityMap");
};

Template.page.showStoryEditor = function () {
  return Session.get("showStoryEditor");
};

Template.page.showActivity = function () {
  return Session.get("showActivity");
};

Template.page.showGroupList = function () {
  return Session.get("showGroupList");
};

Template.page.showUserSettings = function () {
  return Session.get("showUserSettings");
};

Template.page.showMainSettings = function () {
  return Session.get("showMainSettings");
};

///////////////////////////////////////////////////////////////////////////////
// Common Functions

var appSettings = function () {
  return { 
    // mapsApiKey: "AIzaSyCaBJe5zP6pFTy1qio5Y6QLJW9AdQsPEpQ"
    mapsApiKey: ""
  }
}

var shortMaxLength = function () {
  return 250;
};

var getCurrentActivity = function () {
  if (Session.get("activitySlug")) {
    activity = Activities.findOne({slug: Session.get("activitySlug")});
    if (!activity) { // activity hasn't loaded!
      return null;
    } else {
      return activity;      
    }
  } else {
    return null;
  }
};

var getCurrentActivityId = function () {
  activity = getCurrentActivity();

  if (!activity) { // activity hasn't loaded!
    return null;
  } else {
    Session.set("activityId", activity._id);
    return Session.get("activityId");      
  }
};

var currentActivityHasPhotos = function () {
  activity = getCurrentActivity();

  if(activity) {
    return !!activity.picasaTags && activity.picasaTags.length
  } else {
    return false;
  }
};

var currentActivityHasMap = function () {
  activity = getCurrentActivity();

  if(activity) {
    return activity.lat && activity.lng
  } else {
    return false;
  }
};

var getCurrentGroup = function () {
  if (Session.get("groupId")) {
    return Groups.findOne(Session.get("groupId"));
  } else {
    return null;
  }
};

var getCurrentGroupId = function () {
  group = getCurrentGroup();
  return !!group ? group._id : null;
};

var resetGroup = function () {
  Session.set("groupId", null);
  Session.set("groupSlug", null);
};

var userBelongsToCurrentGroup = function (userId) {
  group = getCurrentGroup();
  if (!group) {
    return false;
  } else {
   return userBelongsToGroup(userId, group._id);
  }
};

var currentUserBelongsToCurrentGroup = function () {
  return userBelongsToCurrentGroup(Meteor.userId());
};

var defaultBack = function () {
  var group = getCurrentGroup();
  if(group) {
    Router.setGroup(group);
  } else {
    Router.setHome();
  }
};

var geoLocation = function(location, callback) {
  if (typeof google == "object" && typeof google.maps == "object") {
    var lat,
        lng,
        geocoder = new google.maps.Geocoder();

    geocoder.geocode( { 'address': location }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        lat = results[0].geometry.location.Ya || results[0].geometry.location.hb;
        lng = results[0].geometry.location.Za || results[0].geometry.location.ib;

        result = {lat: lat, lng: lng, address: results[0].formatted_address};
        if(typeof callback == "function") {
          callback(result);
        } else {
          return result;
        }
      } else {
        callback(false);
      }
    });
  } else {
    return false;
  }
};

Meteor.startup(function () {
  Session.set("appVersion", "v0.9.20");

  Backbone.history.start({ pushState: true });
  // initTemplateChecks();

  Meteor.autorun(function () {
    // if (! Session.get("groupName")) {  
    //   Session.set("groupName", "A Trip");
    // }
    // if (! Session.get("selectedActivity")) {  
    //   var activity = Activities.findOne();
    //   if (activity)
    //     Session.set("selectedActivity", activity._id);
    // }
  });

  $(document).ready(function () {
    $(document).foundation();
  });
});