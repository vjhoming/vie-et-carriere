import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Fix tree positions
content = content.replace(
  /ROAD_WIDTH \/ 2 \+ 150 \+ Math\.random\(\) \* 1400/g,
  'ROAD_WIDTH / 2 + 500 + Math.random() * 1400'
);

// Fix keyboard jump (ArrowUp/KeyW)
content = content.replace(
  /if \(e\.code === 'Space'\) \{/g,
  "if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {"
);

content = content.replace(
  /if \(e\.code === 'Space'\) keysRef\.current\.jump = false;/g,
  "if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.jump = false;"
);

fs.writeFileSync('src/App.tsx', content);
