Meteor.startup(function () {

  if( MarketListItems.find().count() <= 1 ) {
    console.log( "Creating default markets..." );
    MarketListItems.insert( { 'marketName':'Ahorramas' } );
    MarketListItems.insert( { 'marketName':'Mercadona' } );
    MarketListItems.insert( { 'marketName': 'Carrefour' } );
  }

  Meteor.publish( "listItems", function(){
    var listItems = {};
    if ( Meteor.user() ) {
      listItems = ListItems.find( {user:Meteor.userId()} );
    }
    return listItems;
  });
  Meteor.publish( "marketListItems", function(){
    return MarketListItems.find();
  });


  Meteor.methods({
    addItemList : function( listItemName, market ){
      /* TODO:
      */
      var result = ListItems.find( { listItemName: listItemName } ),
          row = result.fetch(),
          itemId;
      market = ( typeof market != "undefined" && market !== "" && market !== null )?market:"";
      if ( row.length > 0 ) {
        itemId = row[0]._id;
        console.log( "id exists" );
      } else {
        console.log( 'Adding Item ...' );
        nextOrder = ListItems.find({}).fetch().length + 1;
        itemId = ListItems.insert({
          'listItemName' : listItemName.trim(),
          'amount':1,
          'btnmode':'btn-default',
          'market': market,
          'active': 1,
          'order':nextOrder,
          'submittedOn': new Date()
        });
      }
      console.log( itemId );
      return itemId;
    },
    updateItemList: function( itemId, btnclass ) {
      ListItems.update( itemId, { $set: { btnmode: btnclass } } );
      console.log( "Updated " + itemId );
      return itemId;
    },
    updateItemNameList: function( itemId, itemName ) {
      ListItems.update( itemId, { $set: { listItemName: itemName.trim() } } );
      console.log( "Updated " + itemId + ", field listItemName with " + itemName );
      return itemId;
    },
    updateMarketItemList: function( itemId, marketSelected ) {
      ListItems.update( itemId, { $set: { market: marketSelected.trim() } } );
      console.log( "Updated " + itemId + ", field market with " + marketSelected.trim() );
      return itemId;
    },
    incrementAmount : function( itemId ){
      console.log( "Increment " + itemId );
      ListItems.update( itemId, { $inc : { 'amount':1 } } );
      return itemId;
    },
    decrementAmount : function( itemId ){
      console.log( "Decrement " + itemId );
      var el = ListItems.find( { _id: itemId } );
      if ( el.fetch()[0].amount > 1 ) {
        ListItems.update( itemId, { $inc : { 'amount':-1 } } );
      }
      return itemId;
    },
    archiveItem: function( itemId ){
      console.log( "Archived " + itemId );
      ListItems.update( itemId, { $set: { active: 0 } } );
      return itemId;
    },
    deleteElem : function( itemId ){
      console.log( "Delete " + itemId );
      ListItems.remove( itemId );
      return itemId;
    },
    showAllItems: function() {
      /* TODO */
    },
    addMarketItemlist: function( marketName ) {
      console.log('Adding Market Item ...');
      var marketId = MarketListItems.insert({
        'marketName' : marketName,
        'submittedOn': new Date()
      });
      console.log( marketId );
      return marketId;
    }
  });

});