---
"@xtarterize/patchers": patch
---

Preserve the existing indentation when Vite plugin tasks (such as `vite/visualizer` and `vite/checker`) patch `vite.config.*`. Tab-indented configs no longer have every indent multiplied by four, inserted plugin lines use the file's own tabs or spaces (4-space configs no longer get 6-space plugin lines), and the file's trailing newline is kept.
