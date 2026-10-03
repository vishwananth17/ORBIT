import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Small dependency-free markdown renderer: headings, bullets, numbered lists,
// code blocks, inline **bold**, *italic* and `code`.
function renderInline(text: string, color: string, codeBg: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    const key = `${keyPrefix}-${i}`;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <Text key={key} style={{ fontWeight: '700', color }}>{p.slice(2, -2)}</Text>;
    }
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
      return <Text key={key} style={{ fontFamily: 'monospace', backgroundColor: codeBg, color }}>{p.slice(1, -1)}</Text>;
    }
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      return <Text key={key} style={{ fontStyle: 'italic', color }}>{p.slice(1, -1)}</Text>;
    }
    return <Text key={key}>{p}</Text>;
  });
}

export const Markdown: React.FC<{ content: string; color: string; children?: React.ReactNode }> = ({ content, color, children }) => {
  const { colors } = useTheme();
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let code: string[] | null = null;

  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      if (code) {
        blocks.push(
          <View key={`c${i}`} style={[styles.codeBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.codeText, { color }]}>{code.join('\n')}</Text>
          </View>
        );
        code = null;
      } else code = [];
      return;
    }
    if (code) { code.push(line); return; }
    if (!line.trim()) { blocks.push(<View key={`s${i}`} style={{ height: 8 }} />); return; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push(<Text key={`h${i}`} style={[styles.heading, { color }]}>{renderInline(h[2], color, colors.surface, `h${i}`)}</Text>);
      return;
    }
    const b = line.match(/^\s*[*\-•]\s+(.*)$/);
    const n = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (b || n) {
      blocks.push(
        <View key={`l${i}`} style={styles.row}>
          <Text style={[styles.bullet, { color }]}>{n ? `${n[1]}.` : '•'}</Text>
          <Text style={[styles.body, { color, flex: 1 }]}>{renderInline((b ? b[1] : n![2]), color, colors.surface, `l${i}`)}</Text>
        </View>
      );
      return;
    }
    blocks.push(<Text key={`p${i}`} style={[styles.body, { color }]}>{renderInline(line, color, colors.surface, `p${i}`)}</Text>);
  });
  if (code) blocks.push(<Text key="cend" style={[styles.codeText, { color }]}>{(code as string[]).join('\n')}</Text>);

  return <View>{blocks}{children}</View>;
};

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 23 },
  heading: { fontSize: 17, fontWeight: '700', lineHeight: 24, marginTop: 6 },
  row: { flexDirection: 'row', paddingLeft: 4 },
  bullet: { width: 22, fontSize: 15, lineHeight: 23 },
  codeBlock: { borderWidth: 1, borderRadius: 10, padding: 12, marginVertical: 6 },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 19 },
});
