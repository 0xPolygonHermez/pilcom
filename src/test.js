
const sleep = ms => new Promise(r => setTimeout(r, ms));
class Rectangle {
    constructor(height, width) {
      this.height = height;
      this.width = width;
    }
    async area() {
        await sleep(2000);
        return 10;
    }
  }

async function myfunc() {
    let rectange = new Rectangle();
    let res = await rectange.area();
    console.log(res);
}

myfunc();
