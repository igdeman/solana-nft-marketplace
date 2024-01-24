anchor build
if [ ! -d "packages/app/src/idl" ]; then
	mkdir -p packages/app/src/idl
fi
if [ ! -f "target/types/*.ts" ]; then
	cp target/types/*.ts packages/app/src/idl/
fi
yarn workspace @igdeman/app build

