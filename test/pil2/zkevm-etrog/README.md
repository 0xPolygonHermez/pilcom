### PIL2 Migration
|ID|subproof|pil2|tools|executor|notes|
|---|----|----|-----|----|----|
|1|main|90%|-|0%||
|2|rom|80%|0%|-|tool: zkasm => pil|
|4|mem|90%|-|0%||
|5|mem_align|80%|-|0%||
|6|range_32|50%|-|0%||
|10|arith|30%|0%|0%|pending: equation generation from pil and last features added (alias free,diff points)|
|20|binary|90%|-|0%||
|20|binary (one_row)|90%|-|-|alternative, no generate executor|
|21|binary_ops_table|90%|-|-||
|40-42|padding_pg|90%|-|0%||
|45|poseidong|95%|-|0%||
|50-52|padding_kk|0%|-|0%||
|55|padding_kkbit|0%|-|0%||
|56|keccakf|90%|0%|0%|tool: script/circuit => pil|
|57|keccakf_table|90%|-|-||
||bits2field|-|-|-|deleted, integrated inside keccakf
|60-62|padding_sha256|0%|-|0%||
|65|padding_sha256bit|10%|-|0%||
|66|sha256f|80%|0%|0%|tool: script/circuit => pil|
|67|sha256f_table|90%|-|-||
||bits2field_sha256|-|-|-|deleted, integrated inside sha256f
|90|storage|80%|-|%0||
|91|storage_rom|100%|100%|-|tool: zkasm => pil|
|92|climb_key|90%|-|0%||
|93|climb_key_table|100%|100%|-|tool: validate/generate constants|

### TOOLS
|tool|status|notes|
|---|----|----|
|zkasm_rom2pil|0%|used to generate pil from rom.json|
|equation2pil|0%|generate equation pols with prior/next window|
|keccakf_script2pil|0%|used to generate pil from keccak script json|
|sha256_script2pil|0%|used to generate pil from sha256 script json|
|zkasm_storagerom2pil|100%|used to generate pil from storage-rom.json|
|climbkey_table|100%|used to verify complex climbkey fixed columns|
