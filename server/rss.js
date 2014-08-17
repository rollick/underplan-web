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
      link: 'https://underplan.io/' + group.slug + '/' + activity._id,
      pubDate: activity.created
    });
  });

});