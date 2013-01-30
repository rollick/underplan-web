// Underplan -- data model
// Loaded on both the client and the server

///////////////////////////////////////////////////////////////////////////////
// Groups

/*
  Groups are a top level container for models like Activities. Eventually they will include
  membership and access control (for posting, editing etc) based on this membership.
*/

Groups = new Meteor.Collection("groups");

Groups.allow({
  insert: function (userId, group) {
    return false; // no cowboy inserts -- use createGroup method
  },
  update: function (userId, groups, fields, modifier) {
    return false; // no updates for now!
  },
  remove: function (userId, groups) {
    return ! _.any(groups, function (group) {
      // deny if not the owner
      return group.owner !== userId;
    });
  }
});

Meteor.methods({
  // options should include: name
  createGroup: function (options) {
    options = options || {};
    if (typeof options.name === "string" && options.name.length > 100)
      throw new Meteor.Error(413, "Name too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    if ( typeof options.slug === "undefined" || options.slug == "" )
      options.slug = createLinkSlug(options.name);

    return Groups.insert({
      owner:      this.userId,
      name:       options.name,
      created:    options.created,
      slug:       options.slug,
    });
  },
});

///////////////////////////////////////////////////////////////////////////////
// Activities

/*
  This is an abstract model to represent travel activities, eg geo location, story post,
  photos added. At its most basic the event can have a title, text or 
  geo location. For example, a new destination would just have a geo location 
  (and possibly a title), a story would have text (and possibly a geo location), a photo
  would be a url to a publically accessible image.
*/

Activities = new Meteor.Collection("activities")

Activities.allow({
  insert: function (userId, activity) {
    return false; // no cowboy inserts -- use createActivity method
  },
  update: function (userId, activities, fields, modifier) {
    return _.all(activities, function (activity) {
      if (userId !== activity.owner)
        return false; // not the owner

      var allowed = ["slug", "published", "location", "title", "text", "lat", "lng", "url", "urlType", "created"];
      if (_.difference(fields, allowed).length)
        return false; // tried to write to forbidden field

      // A good improvement would be to validate the type of the new
      // value of the field (and if a string, the length.) In the
      // future Meteor will have a schema system to makes that easier.
      return true;
    });
  },
  remove: function (userId, activities) {
    return ! _.any(activities, function (activity) {
      // deny if not the owner
      return activity.owner !== userId;
    });
  }
});

Meteor.methods({
  // options should include: title, description, x, y, public
  createActivity: function (options) {
    options = options || {};
    if (typeof options.title === "string" && options.title.length > 100)
      throw new Meteor.Error(413, "Title too long");
    if (typeof options.text === "string" && options.text.length > 1000)
      throw new Meteor.Error(413, "Text too long");
    if (! this.userId)
      throw new Meteor.Error(403, "You must be logged in");

    if ( typeof options.created === "undefined" )
      options.created = new Date()

    if ( typeof options.slug === "undefined" || options.slug == "" )
      options.slug = createLinkSlug(options.title);

    return Activities.insert({
      owner:      this.userId,
      lat:        options.lat,
      lng:        options.lng,
      title:      options.title,
      text:       options.text,
      url:        options.url,
      urlType:    options.urlType,
      tags:       [],
      created:    options.created,
      location:   options.location,
      slug:       options.slug,
      published:  !! options.published
    });
  },
});

var createLinkSlug = function (str) {
  return str.replace(/!|'|"|,/g, "").replace(/\s/g, "-").toLowerCase();
}

var activityType = function (activity) {
    if (typeof activity.urlType === "string" && activity.urlType.length) {
      return activity.urlType;
    } else if ( typeof activity.title === "string" && activity.title.length && typeof activity.text === "string" && activity.text.length ) {
      return "story";
    } else if ( typeof activity.lat === "float" && typeof activity.lng === "float" && typeof activity.description === "undefined" ) {
      return "location";
    } else {
      return "undefined";
    }
  }

///////////////////////////////////////////////////////////////////////////////
// Comments

/*
  Comments can be added against an activity.
*/

Comments = new Meteor.Collection("comments");

Comments.allow({
  insert: function (userId, comment) {
    return false; // no cowboy inserts -- use createComment method
  },
  update: function (userId, activities, fields, modifier) {
    return false; // no updates for now!
  },
  remove: function (userId, activities) {
    return ! _.any(activities, function (activity) {
      // deny if not the owner
      return activity.owner !== userId;
    });
  }
});

///////////////////////////////////////////////////////////////////////////////
// Users

var displayName = function (user) {
  if (user.profile && user.profile.name)
    return user.profile.name;
  return user.emails[0].address;
};

var contactEmail = function (user) {
  if (user.emails && user.emails.length)
    return user.emails[0].address;
  if (user.services && user.services.facebook && user.services.facebook.email)
    return user.services.facebook.email;
  return null;
};
