#!/bin/bash

FILE="./app/api/infrastuktur/4irigasikondisibaik/route.ts"

# Perbaiki indentasi & hapus backslash
sed -i 's/^\s*kdirigasi:.*/  kdirigasi: { type: integer, example: 114 }/' "$FILE"
sed -i 's/^\s*username:.*\\/  username:  { type: string, nullable: true, example: null }/' "$FILE"

echo "✅ YAML errors fixed in $FILE"












