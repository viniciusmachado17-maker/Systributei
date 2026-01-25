import fs from "fs";

const CSV_FILE_PATH = "EXPORT_EANS.csv";

const targets = [
    "7898288821133;ALCOOL FLOPS 1L 92",
    "7892840820664;PEPSI BLACK PET 1",
    "7898910095185;ALCOOL TUPI 46",
    "7891000244449;IOGURTE NESTLE 1",
    "7908324403275;SABAO PO MINUANO 1",
    "7898288820013;ALCOOL FLOPS 92",
    "7894900550061;DEL VALLE FRUT 1",
    "7894900556063;DEL VALLE FRUT 1",
    "7899997600811;SORVETE MR 1",
    "7898951850064;MAC"
];

async function findLines() {
    try {
        const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
        const lines = content.split(/\r?\n/);

        console.log("Linhas encontradas no CSV (Exatas):");
        console.log("---------------------------------------------------");

        lines.forEach((line, index) => {
            // Verifica se a linha começa com algum dos "EANs" quebrados identificados no banco
            for (const target of targets) {
                if (line.startsWith(target)) {
                    console.log(`Linha ${index + 1}:`);
                    console.log(line);
                    console.log("---------------------------------------------------");
                }
            }
        });

    } catch (error) {
        console.error("Erro:", error);
    }
}

findLines();
