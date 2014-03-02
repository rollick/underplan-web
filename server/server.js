// Underplan -- server

Meteor.startup(function () {
  // Browser policies:
  // Script:
  BrowserPolicy.content.allowInlineScripts();
  BrowserPolicy.content.allowEval();
  BrowserPolicy.content.allowScriptOrigin("*.gstatic.com");
  BrowserPolicy.content.allowScriptOrigin("https://cdn.mxpnl.com");
  BrowserPolicy.content.allowScriptOrigin("http://maps.google.com");
  BrowserPolicy.content.allowScriptOrigin("https://apis.google.com");
  BrowserPolicy.content.allowScriptOrigin("http://apis.google.com");
  BrowserPolicy.content.allowScriptOrigin("https://maps.googleapis.com");
  BrowserPolicy.content.allowScriptOrigin("http://maps.googleapis.com");
  BrowserPolicy.content.allowScriptOrigin("http://*.googleapis.com");
  BrowserPolicy.content.allowScriptOrigin("https://*.googleapis.com");
  BrowserPolicy.content.allowScriptOrigin("http://www.dbpedialite.org");
  BrowserPolicy.content.allowScriptOrigin("https://en.wikipedia.org");

  // Style:  
  BrowserPolicy.content.allowStyleOrigin("http://fonts.googleapis.com");
  BrowserPolicy.content.allowStyleOrigin("https://fonts.googleapis.com");
  // Image:
  // BrowserPolicy.content.allowImageOrigin("https://profiles.google.com/");
  // BrowserPolicy.content.allowImageOrigin("https://lh3.googleusercontent.com");
  // BrowserPolicy.content.allowImageOrigin("http://maps.googleapis.com");
  BrowserPolicy.content.allowImageOrigin("*");
  // Font
  BrowserPolicy.content.allowFontOrigin("http://themes.googleusercontent.com");
  BrowserPolicy.content.allowFontOrigin("https://themes.googleusercontent.com");
});

this.getActivityConditons = function (groupId, userId) {
  // don't return any activities without a groupId
  if (_.isNull(groupId))
    return [];

  // TODO: The code below to get the groups for matching the activities is 
  //       reduntant now because we only pass a single groupId but will leave the 
  //       code here for use in the future
  var groupConds = {
    $and: [
      {$or: [
        {"approved": {$exists: false}}, 
        {"approved": true},
        {"owner": userId},
        {"invited": userId}
      ]}
    ]
  };

  if (_.isString(groupId)) {
    groupConds.$and.push({_id: groupId});
  }

  var groupIds = Groups.find(groupConds, {fields: {_id: 1}}).map(function(group) {
    return group._id;
  });

  // Get a list of groups to which the current user belongs or is the owner
  var memberGroupIds = Groups.find({$or: [{invited: userId}, {owner: userId}]}).map(function(group) {
    return group._id;
  });

  var activityConds = {
    $and: [ 
      {$or: [
        {"published": true},
        {"owner": userId},
        {"group": {$in: memberGroupIds}}
      ]},
      {"group": {$in: groupIds}},
    ]
  };

  return activityConds;
}

this.standardUserFields = function () {
  return {
      "createdAt": 1, 
      "admin": 1,
      // The profile fields below will be published for all 
      // users but only the logged in user will receive email, locale etc
      "profile.name": 1,
      "profile.picture": 1,
      "profile.link": 1,
      "profile.url": 1,
      "services.google.id": 1,
      "services.github.id": 1,
      "services.twitter.id": 1,
      "services.facebook.id": 1
    };
}