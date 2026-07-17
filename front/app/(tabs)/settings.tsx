import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { AppText, Label, Title } from '@/components/ui/typography';
import { confirmAction } from '@/lib/confirm-action';
import { exportSnapshot, importSnapshot } from '@/lib/db';
import { useAppStore } from '@/store/app-store';
import type { Category, Currency, ThemeMode } from '@/types/domain';

const currencies: Currency[] = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'];
const categoryColors = ['#2563EB', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
const themeModes: ThemeMode[] = ['system', 'light', 'dark'];
const themeModeLabels: Record<ThemeMode, string> = { system: '跟随系统', light: '浅色', dark: '深色' };
const categoryModules: Category['module'][] = ['subscription', 'item'];
const categoryModuleLabels: Record<Category['module'], string> = { subscription: '订阅分类', item: '物品分类' };

export default function SettingsScreen() {
  const settings = useAppStore((state) => state.settings);
  const categories = useAppStore((state) => state.categories);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const initialize = useAppStore((state) => state.initialize);
  const addCategory = useAppStore((state) => state.addCategory);
  const removeCategory = useAppStore((state) => state.removeCategory);
  const [budget, setBudget] = useState(String(settings.monthlyBudget));
  const [idleDays, setIdleDays] = useState(String(settings.itemIdleAlertDays));
  const [categoryName, setCategoryName] = useState('');
  const [categoryModule, setCategoryModule] = useState<Category['module']>('subscription');
  const [categoryColor, setCategoryColor] = useState(categoryColors[0]);

  const save = async () => {
    const monthlyBudget = Number(budget);
    const itemIdleAlertDays = Number(idleDays);
    await updateSettings({
      ...settings,
      monthlyBudget: Number.isFinite(monthlyBudget) ? Math.max(0, monthlyBudget) : 0,
      itemIdleAlertDays: Number.isFinite(itemIdleAlertDays) ? Math.max(1, Math.floor(itemIdleAlertDays)) : 1,
    });
    Alert.alert('已保存', '设置已更新');
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return Alert.alert('通知未授权', '请在系统设置中允许通知。');
    }
    await updateSettings({ ...settings, notificationEnabled: value });
  };

  const exportData = async () => {
    try {
      const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!directory) throw new Error('missing export directory');
      const snapshot = await exportSnapshot();
      const path = `${directory}lifeledger-export-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(snapshot, null, 2));
      await Share.share({ url: path, title: 'LifeLedger 数据备份', message: 'LifeLedger 数据备份文件' });
    } catch {
      Alert.alert('导出失败', '无法生成备份文件，请稍后再试。');
    }
  };

  const importData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled || !result.assets[0]) return;
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== 'object') throw new Error('invalid json');
      await importSnapshot(payload);
      await initialize();
      Alert.alert('导入完成', '数据已合并到本地数据库。');
    } catch {
      Alert.alert('导入失败', '请选择由 LifeLedger 导出的有效 JSON 文件。');
    }
  };

  const createCategory = async () => {
    if (!categoryName.trim()) return Alert.alert('请填写分类名称');
    await addCategory({ name: categoryName.trim(), module: categoryModule, color: categoryColor });
    setCategoryName('');
  };

  return (
    <Screen title="设置" subtitle="本地优先、可导入导出、可申请 Android 通知权限">
      <Card className="mb-4">
        <CardContent className="gap-3">
          <Title>偏好设置</Title>
          <Label>主题模式</Label>
          <ChoiceGroup values={themeModes} value={settings.themeMode} labels={themeModeLabels} onChange={(themeMode) => updateSettings({ ...settings, themeMode })} />
          <Label>基础币种</Label>
          <ChoiceGroup values={currencies} value={settings.baseCurrency} onChange={(baseCurrency) => updateSettings({ ...settings, baseCurrency })} />
          <Label>月度订阅预算</Label>
          <Input keyboardType="decimal-pad" value={budget} onChangeText={setBudget} accessibilityLabel="月度订阅预算" />
          <Label>默认物品闲置提醒天数</Label>
          <Input keyboardType="number-pad" value={idleDays} onChangeText={setIdleDays} accessibilityLabel="默认物品闲置提醒天数" />
          <View className="bg-muted flex-row items-center justify-between rounded-lg p-3">
            <View>
              <Label className="text-base">本地通知</Label>
              <AppText className="text-muted-foreground text-sm">用于续费和闲置提醒</AppText>
            </View>
            <Switch checked={settings.notificationEnabled} onCheckedChange={toggleNotifications} accessibilityLabel="开启本地通知" />
          </View>
          <Button onPress={save}><Text>保存设置</Text></Button>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="gap-3">
          <Title>分类管理</Title>
          <Input placeholder="分类名称，例如 AI 工具 / 厨房用品" value={categoryName} onChangeText={setCategoryName} accessibilityLabel="分类名称" />
          <ChoiceGroup values={categoryModules} value={categoryModule} labels={categoryModuleLabels} onChange={setCategoryModule} />
          <View className="flex-row flex-wrap gap-2">
            {categoryColors.map((color) => (
              <Button key={color} size="sm" variant={categoryColor === color ? 'default' : 'secondary'} onPress={() => setCategoryColor(color)} accessibilityLabel={`选择分类颜色 ${color}`}>
                <Text>{color}</Text>
              </Button>
            ))}
          </View>
          <Button onPress={createCategory}><Text>新增分类</Text></Button>
          {(['subscription', 'item'] as const).map((module) => (
            <View key={module} className="gap-2">
              <Label>{module === 'subscription' ? '订阅分类' : '物品分类'}</Label>
              {categories.filter((category) => category.module === module).map((category) => (
                <View key={category.id} className="bg-muted flex-row items-center justify-between rounded-lg p-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <Label className="text-base">{category.name}</Label>
                  </View>
                  <Button
                    size="sm"
                    variant="ghost"
                    accessibilityLabel={`删除分类 ${category.name}`}
                    onPress={() => confirmAction('删除分类', `删除 ${category.name} 后，关联数据会变为未分类。`, () => removeCategory(category.id))}
                  >
                    <Text>删除</Text>
                  </Button>
                </View>
              ))}
            </View>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="gap-3">
          <Title>数据安全</Title>
          <AppText className="text-muted-foreground">数据保存在设备本地 SQLite。你可以导出 JSON 做备份，也可以从 JSON 合并恢复。</AppText>
          <View className="flex-row gap-3">
            <Button className="flex-1" variant="secondary" onPress={exportData} accessibilityLabel="导出 LifeLedger JSON 备份"><Text>导出</Text></Button>
            <Button className="flex-1" onPress={importData} accessibilityLabel="导入 LifeLedger JSON 备份"><Text>导入</Text></Button>
          </View>
        </CardContent>
      </Card>
    </Screen>
  );
}
