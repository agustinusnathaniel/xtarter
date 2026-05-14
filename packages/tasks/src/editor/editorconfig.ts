import { createFileTask } from '@/factory'

const EDITORCONFIG = `root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
`

export const editorconfigTask = createFileTask({
	id: 'editor/editorconfig',
	label: 'EditorConfig',
	group: 'Editor',
	applicable: () => true,
	filepath: '.editorconfig',
	render: () => EDITORCONFIG,
})
