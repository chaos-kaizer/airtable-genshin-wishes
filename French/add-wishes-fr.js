//Output introductions & ask for user table
output.markdown("# Mise à jour des voeux");
let table = await input.tableAsync("Sélectionnez l'onglet contenant vos voeux");

//DEFINE FUNCTIONS
///////////////////////////////////////////////////////////////////////////////////

//Get types from the gatcha types table return object with and array for each column
let getGatchaTypes = async function(){
  let result = await base.getTable("🔒 gatcha types").selectRecordsAsync();
  let obj = {tableTypes:[],tableId:[]};
  for (let record of result.records) {
    obj.tableTypes.push(record.getCellValue("name"));
    obj.tableId.push(record.getCellValue("gatcha_id"));
  }
  return obj;
}
//Ask for the banner and return the ID based on gatcha types table
let getBanner = async function(){
  let gatchaObject = await getGatchaTypes();
  let selectedBanner = await input.buttonsAsync("Quelle bannière souhaitez-vous mettre à jour ?",gatchaObject.tableTypes);
  return gatchaObject.tableId[gatchaObject.tableTypes.findIndex((element) => element == selectedBanner)];
}
//Match Url encoded Authkey and return page wish URL
let buildURL = async function(banner){
  let authkey = await input.textAsync("Collez l'URL du service client");
  authkey = authkey.match(new RegExp("(?<=authkey=).*?(?=&)","gi"))[0];
  return "https://hk4e-api-os.mihoyo.com/event/gacha_info/api/getGachaLog?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type="+banner+"&lang=fr&authkey="+authkey+"&gacha_type="+banner+"&size=20&page=";
}
//Search for first value in a field on a specific table and return the record id as String
let getRecordIdFromCellValue = async function(tableName,fieldName,value){
  let result = await base.getTable(tableName).selectRecordsAsync();
  for (let record of result.records) {
    if(record.getCellValue(fieldName) == value){
      return record.id;
    }
  }
}
//Add wishes to table in reverse order
let updateWishes = async function(wishTable){
  wishTable.reverse();
  let wishObjArray = [];
  for (let wish of wishTable){
    wishObjArray.push({"fields" : {
      "item_id":[{'id':await getRecordIdFromCellValue("🔒 items","item_id",wish.item_id)}],
      "gatcha_type":[{'id':await getRecordIdFromCellValue("🔒 gatcha types","gatcha_id",wish.gacha_type)}],
      "Date": wish.time
    }});

    if(wishObjArray.length == 50 || wish === wishTable[wishTable.length-1]){
      await table.createRecordsAsync(wishObjArray);
      wishObjArray.length = 0;
    }
  }
  output.markdown("**Mise à jour terminée !**");
}
//Fetch the JSON for a specific page wish
let getWishesAtPage = async function(url,page){
  return await (await fetch(" https://cors-anywhere.herokuapp.com/"+url+page)).json();
}
//Fetch all JSON pages wishes
let getAllWishes = async function(url){
  let page = 1;
  let returnTable = [];
  let endNotReached = true;

  while(endNotReached){
    let obj = await getWishesAtPage(url,page);
    if(obj.retcode > -1 && obj.data.list.length > 0){
      obj.data.list.forEach(wishElement => returnTable.push(wishElement));
      page ++;
    }
    else if(obj.retcode == 0 && obj.data.list.length == 0){
      endNotReached = false;
    }
  }
  return returnTable;
}
//Get Mihoyo UID
let getUID = async function(url){
  let json = await getWishesAtPage(url,1);
  if(json.retcode > -1 && json.data.list.length > 0){
    return json.data.list[0].uid;
  }
  else{
    return false;
  }
}
//Create wish object
let createWishObjectFromRecord = function(userid,gatchaid,itemid,date){
  return {
    uid:userid,
    gacha_type:gatchaid,
    item_id:itemid,
    count: "1",
    time:date
  };
}
//Check if object in table are the same
let arrayOfObjectsAreSame = function(table1, table2) {
   var objectsAreSame = true;
   for(var i=0; i<table1.length; i++){
     if(objectsAreSame){
      for(var propertyName in table1[i]) {
          if(table1[i][propertyName] !== table2[i][propertyName]) {
            objectsAreSame = false;
            break;
          }
      }
     }
     else{break;}
   }
   return objectsAreSame;
}

//RUN
///////////////////////////////////////////////////////////////////////////////////
try{
  //Prevent user to edit forbidden tables
  if(table.name == "🔒 items" || table.name == "🔒 gatcha types") throw "Vous ne pouvez pas modifier l'onglet selectionné.";

  //Ask for banner and build URL
  let banner = await getBanner();
  let url = await buildURL(banner);
  let uid = await getUID(url);

  //Retrieve All wishes
  output.markdown("**Recherche des voeux en cours...**");
  output.markdown("*Cette action peux prendre plusieurs minutes merci de patienter* ⏳😉");
  let allWishes = await getAllWishes(url);

  //Get and filter registered wishes for this banner
  let result = await table.getView("Grid view").selectRecordsAsync({sorts:[{field: "ID", direction: "desc"}]});
  let filteredRecords = result.records.filter(record => {
    let gtype = record.getCellValue("gatcha_type")[0].name;
    return gtype == banner
  });

  switch (filteredRecords.length) {
    //Get all wishes if no wish found
    case 0:
      output.markdown("**"+allWishes.length+" nouveaux voeux trouvés**");
      await updateWishes(allWishes);
    break;

    //If found recorded wishes get Only new wishes
    default:
      if(allWishes.length == 0){
        output.markdown("**Aucun voeux trouvé pour cette bannière,** ");
        output.markdown("Cliquez à nouveau sur *Run* pour mettre à jour d'autre voeux");
      }
      else{
        let lastWishes = [];
        let newWishes = [];
        let sampleSize = 3;
        if (allWishes.length < sampleSize) sampleSize = allWishes.length;

        //Populate table with last wishes
        for(var i=0; i<sampleSize; i++){
          lastWishes.push(createWishObjectFromRecord(
            uid,
            filteredRecords[i].getCellValue("gatcha_type")[0].name,
            filteredRecords[i].getCellValue("item_id")[0].name,
            filteredRecords[i].getCellValue("Date")
          ));
        }

        //loop through all wishes
        for(var j=0; j <= allWishes.length - sampleSize; j++){

          //Create the wish block to compare
          var wishBlock = [];
          for(var k=j; k < j+sampleSize; k++){
            wishBlock.push(allWishes[k]);
          }

          //Compare to last wishes
          if(!arrayOfObjectsAreSame(wishBlock,lastWishes)){
            newWishes.push(allWishes[j]);
          }
          else{break;}
        }
        output.markdown("**"+newWishes.length+" nouveaux voeux trouvés**");
        await updateWishes(newWishes);
      }
    break;
  }
}
catch(error){
    output.clear();
    output.markdown("# Désolé.");
    output.markdown("**Une erreur est survenue.**");
    output.markdown("Vérifiez l'URL renseignée ou mettez à jour votre navigateur.");
    output.markdown("*Cliquez sur Run pour recommencer.*");
    output.text(error);
}