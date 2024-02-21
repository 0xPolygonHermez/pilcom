Migration of zkevm pils to current version using vadcops.
|ID|subproof|pil2|tools|executor|notes|
|---|----|----|-----|----|----|
|1|main|90%|N/A|0%||
|2|rom|80%|0%||tool: zkasm => pil|
|4|mem|90%||
|5|mem_align|80%||
|6|range_32|50%||
|10|arith|30%|||pending equation generation and last features added (alias free,diff points)|
|20|binary|95%||
|20|binary (one_row)|95%||||
|21|binary_ops_table|95%|N/A|N/A||
|40-42|padding_pg|||
|45|poseidong|95%||
|50-52|padding_kk|||
|55|padding_kkbit|||
|56|keccakf||0%||tool: script/circuit => pil|
|57|keccakf_table|||
||bits2field|N/A|||integrated inside keccakf
|60-62|padding_sha256|||
|65|padding_sha256bit|||
|66|sha256f|80%|0%||tool: script/circuit => pil|
|67|sha256f_table|||
||bits2field_sha256|N/A|||integrated inside sha256f
|90|storage|95%||||
|91|storage_rom|95%|95%|N/A|tool: zkasm => pil|
|92|climb_key|95%||||
|93|climb_key_table|95%|100%|N/A|tool: validate/generate constants|
