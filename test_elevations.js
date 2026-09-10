const common = [0.2, 0.7, 1.2, 1.7, 2.2, 2.7];
const kicker = common[0];
const highestCommon = common[common.length - 1];

const selected = [];
selected.push(kicker);

if (highestCommon > kicker + 0.4) {
    let curr = highestCommon;
    while (curr > kicker + 0.4) {
        selected.push(curr);
        const nextElev = common.slice().reverse().find(e => curr - e >= 0.95);
        if (!nextElev) break;
        curr = nextElev;
    }
}
// remove duplicates just in case? Or sort and deduplicate
const unique = [...new Set(selected)].sort((a,b)=>a-b);
console.log(unique);
