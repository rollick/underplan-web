// Underplan -- client
Meteor.subscribe("activities");
Meteor.subscribe("allComments");
Meteor.subscribe("allGroups");
Meteor.subscribe("directory");

///////////////////////////////////////////////////////////////////////////////
// Templates

feedLimitSkip = 5;

appTemplates = function () {
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

showTemplate = function (templateName, callback) {
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
appSettings = function () {
  return { 
    mapsApiKey: "AIzaSyCaBJe5zP6pFTy1qio5Y6QLJW9AdQsPEpQ"
  }
}

shortMaxLength = function () {
  return 250;
};

getCurrentActivity = function () {
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

getCurrentActivityId = function () {
  activity = getCurrentActivity();

  if (!activity) { // activity hasn't loaded!
    return null;
  } else {
    Session.set("activityId", activity._id);
    return Session.get("activityId");      
  }
};

currentActivityHasPhotos = function () {
  activity = getCurrentActivity();

  if(activity) {
    return !!activity.picasaTags && activity.picasaTags.length
  } else {
    return false;
  }
};

currentActivityHasMap = function () {
  activity = getCurrentActivity();

  if(activity) {
    return activity.lat && activity.lng
  } else {
    return false;
  }
};

getCurrentGroup = function () {
  if (Session.get("groupId")) {
    return Groups.findOne(Session.get("groupId"));
  } else {
    return null;
  }
};

isFollowingGroup = function (userId, groupId) {
  var user = Meteor.users.findOne({_id: userId});

  if (user && user.profile.followedGroups) {
    return user.profile.followedGroups[groupId];
  } else {
    return false
  }
};

// Set group follow for current user
followGroup = function (groupId, state) {
  if(typeof state === "undefined")
    state = true;

  var currentFollows = Meteor.user().profile.followedGroups || {};
  currentFollows[groupId] = state;

  Meteor.users.update({_id: Meteor.userId()}, {$set: {"profile.followedGroups": currentFollows}});
};

followCurrentGroup = function (state) {
  if(typeof state === "undefined")
    state = true;

  followGroup(getCurrentGroupId(), state);
}

getCurrentGroupId = function () {
  group = getCurrentGroup();
  return !!group ? group._id : null;
};

resetGroup = function () {
  Session.set("groupId", null);
  Session.set("groupSlug", null);
};

userBelongsToCurrentGroup = function (userId) {
  group = getCurrentGroup();
  if (!group) {
    return false;
  } else {
   return userBelongsToGroup(userId, group._id);
  }
};

currentUserBelongsToCurrentGroup = function () {
  return userBelongsToCurrentGroup(Meteor.userId());
};

defaultBack = function () {
  var group = getCurrentGroup();
  if(group) {
    Router.setGroup(group);
  } else {
    Router.setHome();
  }
};

autocomplete = null;

geoLocation = function(location, inputId, callback) {
  if (typeof google == "object" && typeof google.maps == "object") {
    var lat,
        lng,
        result,
        pac_input = document.getElementById(inputId);

    autocomplete = new google.maps.places.Autocomplete(pac_input);

    google.maps.event.addListener(autocomplete, 'place_changed', function() {
      var place = autocomplete.getPlace();

      if (!place || !place.geometry) {
        return false;
      }

      lat = place.geometry.location.lat() || place.geometry.location.Ya || place.geometry.location.hb;
      lng = place.geometry.location.lng() || place.geometry.location.Za || place.geometry.location.ib;

      var city, region, country;
      for (var i=0; i < place.address_components.length; i++) {
        if (place.address_components[i].types[0] == "locality") {
          //this is the object you are looking for
          city = place.address_components[i].long_name;
        }
        
        if (place.address_components[i].types[0] == "administrative_area_level_1") {
          //this is the object you are looking for
          region = place.address_components[i].long_name;
        }
        
        if (place.address_components[i].types[0] == "country") {
          //this is the object you are looking for
          country = place.address_components[i].long_name;
        }
      }

      result = {
        lat: lat, 
        lng: lng, 
        address: place.formatted_address,
        city: city,
        region: region,
        country: country
      };

      if(typeof callback == "function") {
        callback(result);
      } else {
        return result;
      }
    });
  } else {
    return false;
  }
};

timeout = null;

Meteor.startup(function () {
  Session.set("appVersion", "v0.9.74");

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
    if(Meteor.settings) {
      (function(e,b){if(!b.__SV){var a,f,i,g;window.mixpanel=b;a=e.createElement("script");a.type="text/javascript";a.async=!0;a.src=("https:"===e.location.protocol?"https:":"http:")+'//cdn.mxpnl.com/libs/mixpanel-2.2.min.js';f=e.getElementsByTagName("script")[0];f.parentNode.insertBefore(a,f);b._i=[];b.init=function(a,e,d){function f(b,h){var a=h.split(".");2==a.length&&(b=b[a[0]],h=a[1]);b[h]=function(){b.push([h].concat(Array.prototype.slice.call(arguments,0)))}}var c=b;"undefined"!==typeof d?c=b[d]=[]:d="mixpanel";c.people=c.people||[];c.toString=function(b){var a="mixpanel";"mixpanel"!==d&&(a+="."+d);b||(a+=" (stub)");return a};c.people.toString=function(){return c.toString(1)+".people (stub)"};i="disable track track_pageview track_links track_forms register register_once alias unregister identify name_tag set_config people.set people.increment people.append people.track_charge people.clear_charges people.delete_user".split(" ");for(g=0;g<i.length;g++)f(c,i[g]);b._i.push([a,
e,d])};b.__SV=1.2}})(document,window.mixpanel||[]);
      mixpanel.init(Meteor.settings.public.mixpanelToken);
    }

    $(document).foundation();
  });
});