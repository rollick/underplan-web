RssFeed.publish('activities', function(query) {
  var _this = this,
      group = Groups.findOne({slug: query.group});

  if (!group) return

  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  _this.setValue('title', _this.cdata('Underplan: ' + group.name));
  _this.setValue('description', _this.cdata(group.description));
  _this.setValue('link', 'https://underplan.io/' + group.slug);
  _this.setValue('lastBuildDate', new Date());
  _this.setValue('pubDate', new Date());
  _this.setValue('ttl', 1);
  // managingEditor, webMaster, language, docs, generator

  var activityConds = getActivityConditons(group._id);
  Activities.find(activityConds, {sort: {created: -1}}).forEach(function(activity) {
    var limit = 240,
        preview = activity.text.substring(0, limit);

    if(activity.text.length > limit)
      preview += "...";

    var title = activity.title;
    if (!title && activity.location)
       title = activity.location;

    _this.addItem({
      guid: activity._id,
      title: title,
      description: preview,
      link: 'https://underplan.io/' + group.slug + '/pl/' + activity._id,
      pubDate: activity.created
    });
  });
});

RssFeed.publish('comments', function(query) {
  var _this = this,
      group = Groups.findOne({slug: query.group});

  if (!group) return

  // feed handler helpers
  // this.cdata, this.setValue, this.addItem
  _this.setValue('title', _this.cdata('Underplan: ' + group.name));
  _this.setValue('description', _this.cdata('Comments for: ' + group.name));
  _this.setValue('link', 'https://underplan.io/' + group.slug);
  _this.setValue('lastBuildDate', new Date());
  _this.setValue('pubDate', new Date());
  _this.setValue('ttl', 1);
  // managingEditor, webMaster, language, docs, generator

  var activityConds = getActivityConditons(group._id),
      activityOptions = {fields: {_id: 1}, sort: {created: -1}},
      activityIds = [];

  Activities.find(activityConds, activityOptions).forEach( function (activity) { 
    activityIds.push(activity._id);
  });
  
  // only return the comment _id for use in counts
  Comments.find({activityId: {$in: activityIds}}, {sort: {created: -1}}).forEach(function(comment) {
    _this.addItem({
      guid: comment._id,
      title: displayName(Meteor.users.findOne({_id: comment.owner})),
      description: comment.comment,
      link: 'https://underplan.io/' + group.slug + '/pl/' + comment.activityId,
      pubDate: comment.created
    });
  });

});