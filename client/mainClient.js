/* ToDo 
    Router to pages: administrador de logos y market 
    ??? - Poner la lista de botones de mercados con los logos en pequeños 
    Añadir sistema de drag&drop para ordenar
    Crear grupos (slide a un lado para gestionarlo)
    Asociar usuarios a grupos
*/

if ( Meteor.isClient ) {
  ListItems = new Meteor.Collection( "listItems" );
  MarketListItems = new Meteor.Collection( "marketListItems" );
  
  Meteor.subscribe("listItems");
  Meteor.subscribe("marketListItems");

  Meteor.startup(function () {
    Session.set( "active_state", 1 );
    Session.set( "marketSelected", "" );
    alertBoxOpen = false;
    selectMarketBtn();
  });


  /***** addItemList *****/
  Template.addItemList.events({
    'click input.addListItem-btn' : function( e ){
      e.preventDefault();
      var listItemName = document.getElementById( "listItemName" ).value;
      if ( listItemName !== "" ) {
        /* TODO 
          Comprobar si está logado antes de insertar
        */
        var market = Session.get( "selected_marketName" );
        Meteor.call( "addItemList", listItemName, market, function( error , itemId ){
          if ( $( "#listItemName_" + itemId ).length === 0 ) {
            console.log( 'Added listItem with ID: ' + itemId ) ;
          }
          blinkObj( itemId );          
        });
      }
      document.getElementById( "listItemName" ).value = "";
    },
    'keypress': function( e ){
      var code = e.keyCode || e.which;
       if(code == 13) {
         $( "input.addListItem-btn" ).trigger( "click" );
       }
    }
  });
  
  Template.addItemList.helpers({
    isLogged:function(){
      return ( Meteor.userId() !== null );
    }
  });

  /****** listItem ******/
  Template.listItem.events({
    'click': function () {
      Session.set( "selected_listItem", this._id );
      Session.set( "selected_listItemName", this.listItemName );
    },
    'click a.inc' : function( e ) {
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' );
      console.log( 'increment counter for itemId ' + itemId );
      Meteor.call( "incrementAmount", itemId );
    },
    'click a.dec': function( e ) {
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' );
      console.log( 'decrement counter for itemId ' + itemId );
      Meteor.call( "decrementAmount", itemId );
    },
    'click a.archive': function( e ) {
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' );
      console.log( 'archive itemId ' + itemId );
      Meteor.call( "archiveItem", itemId );
      itemId = Session.get( 'selected_listItem' );
    },
    'click a.delete': function( e ) {
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' ),
          elemName = Session.get( "selected_listItemName" );
      if ( alertBoxOpen === false ) {
        var instance = UI.renderWithData( Template.alertBox, { itemId: itemId, elemName: elemName } );
        UI.insert( instance, $( '.alertBox' )[0] );
        alertBoxOpen = true;
        var p = $( "#elem_"+itemId ).position(),
            x = p.left,
            y = p.top;
        $( ".alertBox" ).css( { position:'absolute', left:x, top:y } );
      }
    },
    'click a.doit': function( e ){
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' );
          //elemName = Session.get( "selected_listItemName" );
      if ( $( "#doit_"+itemId ).hasClass( "btn-default" ) ) {
        Session.set( "doitItem", itemId );
        Meteor.call( "updateItemList", itemId, "btn-success", function( error , itemId ){
          console.log( 'Added listItem with ID: ' + itemId ) ;
          $( "#doit_"+itemId ).removeClass( "btn-default" ).addClass( "btn-success" );
          $( "#listItemName_"+itemId ).css( { "text-decoration": "line-through", "color":"#AAA" } );
        });
      } else {
        Session.set( "doitItem", "" );
        Meteor.call( "updateItemList", itemId, "btn-default", function( error , itemId ){
          console.log( 'Added listItem with ID: ' + itemId ) ;
          $( "#doit_"+itemId ).removeClass( "btn-success" ).addClass( "btn-default" );
          $( "#listItemName_"+itemId ).css( { "text-decoration": "none", "color":"#000" } );
        });
      }
    },
    'click span.listitemname': function( e ) {
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' );
      console.log( "edit " + itemId );
    },
    'keypress span.listitemname': function( e ){
      var code = e.keyCode || e.which,
          itemId = Session.get( 'selected_listItem' );
      if ( code == 13 ) {
        e.preventDefault();
        $( "#listItemName_"+itemId ).trigger( "blur" );
      }
    },
    'blur span.listitemname': function( e ) {
      e.preventDefault();
      var itemId = Session.get( 'selected_listItem' ),
          newValue = $( "#listItemName_"+itemId ).text();
      console.log( "fin edicion " + itemId + " valor: " + newValue );
      Meteor.call( "updateItemNameList", itemId, newValue, function( error , itemId ){
        console.log( 'Updated Item Name from listNameItem with ID: ' + itemId ) ;
      });
    },
    'click button.market' : function( e , tpl ) {
      e.preventDefault();
      var marketId = Session.get( 'selected_listItem' ),
          itemId = tpl.firstNode.id.replace( "elem_", "" ),
          marketSelected = $( "#marketElem_"+marketId ).text().trim();
      console.log( "Producto " + itemId + " seleccionado para el market " +  marketSelected );
      Meteor.call( "updateMarketItemList", itemId, marketSelected, function( error , itemId ){
        console.log( 'Updated market from ID: ' + itemId ) ;
      });
    }
  });

  /****** listItems ******/
  Template.listItems.helpers({
    marketSelectedHelper:function(){
      return _.extend( { marketSelectedVble: this.market, listItemIdVble: this._id }, this );
    },
    isLogged:function(){
      return ( Meteor.userId() !== null );
    },
    items: function() {
      if ( Meteor.userId() ) {
        var market = Session.get( "selected_marketName" ),
            active = Session.get( "active_state" ),
            conditionObj = {};
        if ( typeof market != "undefined" && market !== "" ) { conditionObj.market = market; }
        if ( typeof active != "undefined" && active !== "" ) { conditionObj.active = active; }
        var items = ListItems.find( conditionObj, { sort:{ 'btnmode': 1, 'order':1, 'submittedOn': -1 } } );
        
        return items;
      }
    }
  });
  Template.listItems.rendered = function () {
  };


  /****** marketListItems ******/
  Template.marketListItem.events({
    'click': function(){
      var id = this._id;
      Session.set( 'selected_market', id );
      Session.set( 'selected_marketName', this.marketName );
    },
    'click button': function( e ){
      e.preventDefault();
      var marketId = Session.get( 'selected_market' ),
          marketName = Session.get( 'selected_marketName' );
      if ( $( "#marketElem_"+marketId ).hasClass( "btn-warning" ) ) {
        Session.set( "marketSelected", "" );
        Session.set( "selected_marketName", "" );
        console.log( "unselected market " + marketName );        
      } else {
        Session.set( "marketSelected", marketId );
        Session.set( "selected_marketName", marketName );
        console.log( "selected market " + marketName );
      }
      selectMarketBtn();
      $( "#marketListItemsBtn button" ).trigger( "click" );
    }
  });
  Template.marketListItems.helpers({
    isLogged: function() {
      return Meteor.userId();
    },
    marketItems: function() {
      if ( Meteor.userId() ) {
        var mli = MarketListItems.find( {} );
        return mli;
      }
    }
  });

  /***** marketListItemsDropdown *****/
  Template.marketListItemsDropdown.helpers({
    marketItems: function() {
      return MarketListItems.find( { } );
    }
  });

  /***** marketListItemsBtn *****/
  Template.marketListItemsBtn.events({
    'click button': function(){
      if ( $( "#marketListItems" ).is( ":visible" ) ) {
        $( "#marketListItems" ).slideUp( "slow" );
      } else {
        $( "#marketListItems" ).slideDown( "slow" );
      }
    }
  });

  /***** marketListItemLI ******/
  Template.marketListItemLI.helpers({
    btnSel: function() {
      return "btn-info";
    }
  });


  /****** GENERAL ******/
  Template.alertBox.rendered = function () {
    console.log( ">>> " + $( "button.borrar" ).html() );
    console.log( $( "#alertBlock button.cancelar" ).length );
    $( "#alertBlock button.borrar" ).on( "click", function(){
      var itemId = Session.get( 'selected_listItem' );
      console.log( "borrando elemento " + itemId );
      alertBoxOpen = false;
      Meteor.call( "deleteElem", itemId );
      $( "#alertBlock button.close" ).trigger( "click" );
    });
    $( "#alertBlock button.cancelar" ).on( "click", function(){
      console.log( "Cancelar" );
      alertBoxOpen = false;
      $( "#alertBlock button.close" ).trigger( "click" );
    });
    $( "#alertBlock button.close" ).on( "click", function(){
      alertBoxOpen = false;
    });
  };

  selectMarketBtn = function( marketId ) {
    marketId = marketId;
    $( "button.market" ).removeClass( "btn-warning" ).removeClass( "btn-info" ).addClass( "btn-info" );
    $( "#marketElem_" + Session.get( "marketSelected" ) ).removeClass( "btn-info" ).addClass( "btn-warning" );
  };

  blinkObj = function( itemId ) {
    var i = 0;
    for ( ; i< 5; i++ ) {
      $( "#listItemName_" + itemId ).fadeTo( 250, 0.25 ).fadeTo( 250, 1 );
    }
  };

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}