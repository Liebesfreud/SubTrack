import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChoiceGroup } from '@/components/ui/choice-group';
import { Text } from '@/components/ui/text';
import { Label, Title } from '@/components/ui/typography';
import { isISODate, parseNonNegativeNumber, parsePositiveInteger } from '@/lib/utils';
import type { BillingCycle, Category, Currency, Item, ItemCondition, Subscription, SubscriptionStatus } from '@/types/domain';

const currencies: Currency[] = ['CNY', 'USD', 'EUR', 'GBP', 'JPY'];
const cycles: BillingCycle[] = ['monthly', 'yearly', 'quarterly', 'weekly'];
const subscriptionStatuses: SubscriptionStatus[] = ['active', 'paused', 'cancelled'];
const conditions: ItemCondition[] = ['new', 'good', 'used', 'idle', 'retired'];

type SubscriptionInput = Omit<Subscription, 'id' | 'createdAt'>;
type ItemInput = Omit<Item, 'id' | 'createdAt'>;

function CategoryChoice({ categories, value, onChange }: { categories: Category[]; value?: string; onChange: (value?: string) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      <Button size="sm" variant={!value ? 'default' : 'secondary'} onPress={() => onChange(undefined)}>
        <Text>未分类</Text>
      </Button>
      {categories.map((category) => (
        <Button key={category.id} size="sm" variant={category.id === value ? 'default' : 'secondary'} onPress={() => onChange(category.id)}>
          <Text>{category.name}</Text>
        </Button>
      ))}
    </View>
  );
}

export function SubscriptionForm({
  categories,
  initialValue,
  onCancel,
  onSubmit,
}: {
  categories: Category[];
  initialValue?: Subscription;
  onCancel?: () => void;
  onSubmit: (input: SubscriptionInput) => Promise<void>;
}) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [price, setPrice] = useState(initialValue ? String(initialValue.price) : '');
  const [currency, setCurrency] = useState<Currency>(initialValue?.currency ?? 'CNY');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialValue?.billingCycle ?? 'monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState(initialValue?.nextPaymentDate ?? new Date().toISOString().slice(0, 10));
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(String(initialValue?.notifyDaysBefore ?? 3));
  const [icon, setIcon] = useState(initialValue?.icon ?? '💳');
  const [categoryId, setCategoryId] = useState<string | undefined>(initialValue?.categoryId);
  const [status, setStatus] = useState<SubscriptionStatus>(initialValue?.status ?? 'active');
  const [paymentMethod, setPaymentMethod] = useState(initialValue?.paymentMethod ?? '');
  const [autoRenew, setAutoRenew] = useState(initialValue?.autoRenew ?? true);

  useEffect(() => {
    if (!initialValue) return;
    setName(initialValue.name);
    setPrice(String(initialValue.price));
    setCurrency(initialValue.currency);
    setBillingCycle(initialValue.billingCycle);
    setNextPaymentDate(initialValue.nextPaymentDate);
    setNotifyDaysBefore(String(initialValue.notifyDaysBefore));
    setIcon(initialValue.icon ?? '💳');
    setCategoryId(initialValue.categoryId);
    setStatus(initialValue.status ?? 'active');
    setPaymentMethod(initialValue.paymentMethod ?? '');
    setAutoRenew(initialValue.autoRenew);
  }, [initialValue]);

  const submit = async () => {
    if (!name.trim()) return Alert.alert('请填写订阅名称');
    const parsedPrice = parseNonNegativeNumber(price);
    if (parsedPrice === null) return Alert.alert('请填写有效价格');
    if (!isISODate(nextPaymentDate)) return Alert.alert('请填写有效下次付款日期', '日期格式需要是 YYYY-MM-DD，例如 2026-06-09。');
    const parsedNotifyDays = parseNonNegativeNumber(notifyDaysBefore);
    if (parsedNotifyDays === null || !Number.isInteger(parsedNotifyDays)) return Alert.alert('请填写有效提醒天数');
    await onSubmit({ name: name.trim(), price: parsedPrice, currency, billingCycle, nextPaymentDate, categoryId, notifyDaysBefore: parsedNotifyDays, icon, autoRenew, status, paymentMethod: paymentMethod.trim() || undefined });
    if (!initialValue) {
      setName('');
      setPrice('');
    }
  };

  return (
    <View className="gap-3">
      <Title>{initialValue ? '编辑订阅' : '新增订阅'}</Title>
      <Input placeholder="名称，例如 ChatGPT" value={name} onChangeText={setName} />
      <View className="flex-row gap-3">
        <Input className="flex-1" placeholder="价格" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
        <Input className="w-20" placeholder="图标" value={icon} onChangeText={setIcon} />
      </View>
      <ChoiceGroup values={currencies} value={currency} onChange={setCurrency} />
      <ChoiceGroup values={cycles} value={billingCycle} onChange={setBillingCycle} labels={{ monthly: '每月', yearly: '每年', quarterly: '每季', weekly: '每周' }} />
      <Label>状态</Label>
      <ChoiceGroup values={subscriptionStatuses} value={status} onChange={setStatus} labels={{ active: '使用中', paused: '已暂停', cancelled: '已取消' }} />
      <Label>续费方式</Label>
      <ChoiceGroup values={['auto', 'manual'] as const} value={autoRenew ? 'auto' : 'manual'} onChange={(value) => setAutoRenew(value === 'auto')} labels={{ auto: '自动续费', manual: '手动确认' }} />
      <Label>分类</Label>
      <CategoryChoice categories={categories} value={categoryId} onChange={setCategoryId} />
      <Input placeholder="付款方式，例如 招商银行 / PayPal / App Store" value={paymentMethod} onChangeText={setPaymentMethod} />
      <Input placeholder="下次付款日期 YYYY-MM-DD" value={nextPaymentDate} onChangeText={setNextPaymentDate} />
      <Input placeholder="提前提醒天数" keyboardType="number-pad" value={notifyDaysBefore} onChangeText={setNotifyDaysBefore} />
      <View className="flex-row gap-3">
        {onCancel ? <Button className="flex-1" variant="secondary" onPress={onCancel}><Text>取消</Text></Button> : null}
        <Button className="flex-1" onPress={submit}><Text>{initialValue ? '保存修改' : '保存订阅'}</Text></Button>
      </View>
    </View>
  );
}

export function ItemForm({
  categories,
  defaultIdleDays,
  initialValue,
  onCancel,
  onSubmit,
}: {
  categories: Category[];
  defaultIdleDays: number;
  initialValue?: Item;
  onCancel?: () => void;
  onSubmit: (input: ItemInput) => Promise<void>;
}) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [purchasePrice, setPurchasePrice] = useState(initialValue ? String(initialValue.purchasePrice) : '');
  const [currency, setCurrency] = useState<Currency>(initialValue?.currency ?? 'CNY');
  const [purchaseDate, setPurchaseDate] = useState(initialValue?.purchaseDate ?? new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initialValue?.location ?? '家里');
  const [condition, setCondition] = useState<ItemCondition>(initialValue?.condition ?? 'good');
  const [idleAlertDays, setIdleAlertDays] = useState(String(initialValue?.idleAlertDays ?? defaultIdleDays));
  const [categoryId, setCategoryId] = useState<string | undefined>(initialValue?.categoryId);
  const [warrantyUntil, setWarrantyUntil] = useState(initialValue?.warrantyUntil ?? '');
  const [serialNumber, setSerialNumber] = useState(initialValue?.serialNumber ?? '');
  const [photoUri, setPhotoUri] = useState(initialValue?.photoUri ?? '');
  const [note, setNote] = useState(initialValue?.note ?? '');

  useEffect(() => {
    if (!initialValue) return;
    setName(initialValue.name);
    setPurchasePrice(String(initialValue.purchasePrice));
    setCurrency(initialValue.currency);
    setPurchaseDate(initialValue.purchaseDate);
    setLocation(initialValue.location);
    setCondition(initialValue.condition);
    setIdleAlertDays(String(initialValue.idleAlertDays));
    setCategoryId(initialValue.categoryId);
    setWarrantyUntil(initialValue.warrantyUntil ?? '');
    setSerialNumber(initialValue.serialNumber ?? '');
    setPhotoUri(initialValue.photoUri ?? '');
    setNote(initialValue.note ?? '');
  }, [initialValue]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('相册未授权', '请允许访问相册后再选择物品照片。');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]?.uri) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (!name.trim()) return Alert.alert('请填写物品名称');
    const parsedPrice = parseNonNegativeNumber(purchasePrice);
    if (parsedPrice === null) return Alert.alert('请填写有效购入价');
    if (!isISODate(purchaseDate)) return Alert.alert('请填写有效购入日期', '日期格式需要是 YYYY-MM-DD，例如 2026-06-09。');
    if (warrantyUntil.trim() && !isISODate(warrantyUntil.trim())) return Alert.alert('请填写有效保修日期', '日期格式需要是 YYYY-MM-DD，例如 2027-06-09。');
    if (!location.trim()) return Alert.alert('请填写存放位置');
    const parsedIdleDays = parsePositiveInteger(idleAlertDays);
    if (parsedIdleDays === null) return Alert.alert('请填写有效闲置提醒天数');
    await onSubmit({
      name: name.trim(),
      purchasePrice: parsedPrice,
      currency,
      purchaseDate,
      categoryId,
      location: location.trim(),
      condition,
      usageCount: initialValue?.usageCount ?? 0,
      lastUsedAt: initialValue?.lastUsedAt,
      idleAlertDays: parsedIdleDays,
      warrantyUntil: warrantyUntil.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      photoUri: photoUri || undefined,
      note: note.trim() || undefined,
    });
    if (!initialValue) {
      setName('');
      setPurchasePrice('');
      setWarrantyUntil('');
      setSerialNumber('');
      setPhotoUri('');
      setNote('');
    }
  };

  return (
    <View className="gap-3">
      <Title>{initialValue ? '编辑物品' : '新增物品'}</Title>
      <Input placeholder="名称，例如 Kindle" value={name} onChangeText={setName} />
      <Input placeholder="购入价" keyboardType="decimal-pad" value={purchasePrice} onChangeText={setPurchasePrice} />
      <ChoiceGroup values={currencies} value={currency} onChange={setCurrency} />
      <ChoiceGroup values={conditions} value={condition} onChange={setCondition} labels={{ new: '全新', good: '良好', used: '常用', idle: '闲置', retired: '退役' }} />
      <Label>分类</Label>
      <CategoryChoice categories={categories} value={categoryId} onChange={setCategoryId} />
      <Input placeholder="购入日期 YYYY-MM-DD" value={purchaseDate} onChangeText={setPurchaseDate} />
      <Input placeholder="存放位置" value={location} onChangeText={setLocation} />
      <Input placeholder="闲置提醒天数" keyboardType="number-pad" value={idleAlertDays} onChangeText={setIdleAlertDays} />
      <Input placeholder="保修截止日期，可选 YYYY-MM-DD" value={warrantyUntil} onChangeText={setWarrantyUntil} />
      <Input placeholder="序列号/资产编号，可选" value={serialNumber} onChangeText={setSerialNumber} />
      {photoUri ? <Image source={{ uri: photoUri }} className="bg-muted h-36 w-full rounded-lg" resizeMode="cover" /> : null}
      <View className="flex-row gap-3">
        <Button className="flex-1" variant="secondary" onPress={pickPhoto}><Text>{photoUri ? '更换照片' : '选择照片'}</Text></Button>
        {photoUri ? <Button className="flex-1" variant="ghost" onPress={() => setPhotoUri('')}><Text>移除照片</Text></Button> : null}
      </View>
      <Input placeholder="备注，例如保修期/序列号/购买理由" value={note} onChangeText={setNote} />
      <View className="flex-row gap-3">
        {onCancel ? <Button className="flex-1" variant="secondary" onPress={onCancel}><Text>取消</Text></Button> : null}
        <Button className="flex-1" onPress={submit}><Text>{initialValue ? '保存修改' : '保存物品'}</Text></Button>
      </View>
    </View>
  );
}
