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

var showTemplate = function (templateName, callback) {
  var conditions = appTemplates();
  
  _.each(_.keys(conditions), function(key) {
    if(key === templateName) {
      Session.set(conditions[key], true);
    } else {
      Session.set(conditions[key], false);
    }
  });

  if(_.isFunction(callback))
    callback();
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

// FIXME: move the maps api key to the settings file
var appSettings = function () {
  return { 
    mapsApiKey: "AIzaSyCaBJe5zP6pFTy1qio5Y6QLJW9AdQsPEpQ"
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

var isWatchingGroup = function (userId, groupId) {
  var user = Meteor.users.findOne({_id: userId});

  if (user && user.profile.watchGroups) {
    return user.profile.watchGroups[groupId];
  } else {
    return false
  }
};

// Set group watch for current user
var watchGroup = function (groupId, state) {
  if(typeof state === "undefined")
    state = true;

  var currentWatch = Meteor.user().profile.watchGroups || {};
  currentWatch[groupId] = state;

  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.watchGroups": currentWatch}});
};

var watchCurrentGroup = function (state) {
  if(typeof state === "undefined")
    state = true;

  watchGroup(getCurrentGroupId(), state);
}

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
        lat = results[0].geometry.location.lat() || results[0].geometry.location.Ya || results[0].geometry.location.hb;
        lng = results[0].geometry.location.lng() || results[0].geometry.location.Za || results[0].geometry.location.ib;

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

var timeout = null;

Meteor.startup(function () {
  Session.set("appVersion", "v0.9.57");

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
    // Start Mixpanel
    (function(e,b){if(!b.__SV){var a,f,i,g;window.mixpanel=b;a=e.createElement("script");a.type="text/javascript";a.async=!0;a.src=("https:"===e.location.protocol?"https:":"http:")+'//cdn.mxpnl.com/libs/mixpanel-2.2.min.js';f=e.getElementsByTagName("script")[0];f.parentNode.insertBefore(a,f);b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}var c=b;"undefined"!==
typeof d?c=b[d]=[]:d="mixpanel";c.people=c.people||[];c.toString=function(b){var a="mixpanel";"mixpanel"!==d&&(a+="."+d);b||(a+=" (stub)");return a};c.people.toString=function(){return c.toString(1)+".people (stub)"};i="disable track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config people.set people.increment people.append people.track_charge people.clear_charges people.delete_user".split(" ");for(g=0;g<i.length;g++)f(c,i[g]);b._i.push([a,
e,d])};b.__SV=1.2}})(document,window.mixpanel||[]);
    mixpanel.init(Meteor.settings.public.mixpanelToken);

    $(document).foundation();
  });
});