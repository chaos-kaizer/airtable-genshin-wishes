output.markdown("# Pity");
let table = await input.tableAsync("Sélectionnez l'onglet contenant vos voeux");

//Define dashboard variables
let Banner = function(id,name,pity5Rate){
    //Banner properties
    this.bannerName = name;
    this.bannerId = id;
    this.totalWish = 0;
    this.fourStarAmout = 0;
    this.fiveStarAmount = 0;
    this.last4Star = 0;
    this.last5Star = 0;
    this.max4StarPity = 0;
    this.max5StarPity = 0;
    
    //Get wish list
    this.view = table.getView('Grid view');

    //Output banner content
    this.outputBanner = async function(){
        //Get wishes
        let result = await this.view.selectRecordsAsync({sorts:[{field: "ID", direction: "asc"}]});
        
        //Filter them by banner
        let filteredRecords = result.records.filter(record => {
            let gtype = record.getCellValue("gatcha_type")[0].name;
            return gtype == this.bannerId
        });

        //Get total number of wishes
        this.totalWish = filteredRecords.length;

        //Compute amount of 4 stars and pity max
        for (let index in filteredRecords) {
            let i = parseInt(index);

            if(filteredRecords[i].getCellValue("Rang") == 4){
                this.fourStarAmout ++;
                this.last4Star = i+1;
            }
            else if(filteredRecords[i].getCellValue("Rang") == 5){
                this.fiveStarAmount ++;
                this.last5Star = i+1;
            }
        }

        let readableLast4Star = this.last4Star > 0 ? (this.totalWish-this.last4Star) : 0 ;
        let readableLast5Star = this.last5Star > 0 ? (this.totalWish-this.last5Star) : 0 ;

        //Output
        output.markdown('## '+this.bannerName+' ('+this.totalWish+' voeux)');
        output.markdown('**4**⭐ obtenu il y a **'+readableLast4Star+'** voeux. Pity dans ** '+((this.last4Star+10)-this.totalWish)+'** voeux maximum.');
        output.markdown('**5**🌟 obtenu il y a **'+readableLast5Star+'** voeux. Pity dans ** '+((this.last5Star+pity5Rate)-this.totalWish)+'** voeux maximum.');
        output.markdown('');
    }
}

//Get gatcha types
let result = await base.getTable("🔒 gatcha types").selectRecordsAsync();
let obj = {tableTypes:[],tableId:[]};
for (let record of result.records) {
    obj.tableTypes.push(record.getCellValue("name"));
    obj.tableId.push(record.getCellValue("gatcha_id"));
}

//Create and output banner count
for(let id in obj.tableId){
    let pity = obj.tableId[id] == "302" ? 80 : 90;
    let b = new Banner(obj.tableId[id],obj.tableTypes[id],pity);
    await b.outputBanner();
}