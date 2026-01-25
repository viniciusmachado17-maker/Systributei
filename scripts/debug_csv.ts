import { parse } from "csv-parse/sync";
import fs from "fs";

const CSV_FILE_PATH = "EXPORT_EANS.csv";

try {
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');

    // Teste de leitura das primeiras linhas
    const records = parse(csvContent, {
        separator: ";",
        skip_empty_lines: true,
        relax_column_count: true,
        quote: '\u0000',
        relax_quotes: true,
        columns: [
            "ean", "produto", "ncm", "cest", "status", "erro",
            "cbs_cst_entrada", "cbs_cst_saida", "cbs_cclass_entrada", "cbs_cclass_saida", "cbs_alq_entrada", "cbs_alq_saida", "cbs_red_alq_entrada", "cbs_red_alq_saida", "cbs_alqf_entrada", "cbs_alqf_saida",
            "ibs_cst_entrada", "ibs_cst_saida", "ibs_cclass_entrada", "ibs_cclass_saida", "ibs_alqe_entrada", "ibs_alqe_saida", "ibs_red_alqe_entrada", "ibs_red_alqe_saida", "ibs_alqfe_entrada", "ibs_alqfe_saida", "ibs_alqm_entrada", "ibs_alqm_saida", "ibs_red_alqm_entrada", "ibs_red_alqm_saida", "ibs_alqfm_entrada", "ibs_alqfm_saida"
        ],
        from_line: 2,
        to_line: 6
    });

    console.log("Amostra dos 5 primeiros registros:");
    console.log(JSON.stringify(records, null, 2));

} catch (error) {
    console.error("Erro:", error);
}
