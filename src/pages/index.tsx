import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Switch,
  Spin,
  Alert,
  message,
  Typography,
  Space,
  Form,
  Divider,
  Tabs
} from 'antd';
import {
  SwapOutlined,
  CopyOutlined,
  TranslationOutlined,
  GlobalOutlined,
  ApiOutlined
} from '@ant-design/icons';
import axios from 'axios';
import OpenAI from 'openai';
import './index.less';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

// 语言列表 - 来自doc.md
const LANGUAGES = [
  { value: 'zh', label: '中文', chinese: '中文', english: 'Chinese' },
  { value: 'en', label: '英语', chinese: '英语', english: 'English' },
  { value: 'fr', label: '法语', chinese: '法语', english: 'French' },
  { value: 'pt', label: '葡萄牙语', chinese: '葡萄牙语', english: 'Portuguese' },
  { value: 'es', label: '西班牙语', chinese: '西班牙语', english: 'Spanish' },
  { value: 'ja', label: '日语', chinese: '日语', english: 'Japanese' },
  { value: 'tr', label: '土耳其语', chinese: '土耳其语', english: 'Turkish' },
  { value: 'ru', label: '俄语', chinese: '俄语', english: 'Russian' },
  { value: 'ar', label: '阿拉伯语', chinese: '阿拉伯语', english: 'Arabic' },
  { value: 'ko', label: '韩语', chinese: '韩语', english: 'Korean' },
  { value: 'th', label: '泰语', chinese: '泰语', english: 'Thai' },
  { value: 'it', label: '意大利语', chinese: '意大利语', english: 'Italian' },
  { value: 'de', label: '德语', chinese: '德语', english: 'German' },
  { value: 'vi', label: '越南语', chinese: '越南语', english: 'Vietnamese' },
  { value: 'ms', label: '马来语', chinese: '马来语', english: 'Malay' },
  { value: 'id', label: '印尼语', chinese: '印尼语', english: 'Indonesian' },
  { value: 'tl', label: '菲律宾语', chinese: '菲律宾语', english: 'Filipino' },
  { value: 'hi', label: '印地语', chinese: '印地语', english: 'Hindi' },
  { value: 'zh-Hant', label: '繁体中文', chinese: '繁体中文', english: 'Traditional Chinese' },
  { value: 'pl', label: '波兰语', chinese: '波兰语', english: 'Polish' },
  { value: 'cs', label: '捷克语', chinese: '捷克语', english: 'Czech' },
  { value: 'nl', label: '荷兰语', chinese: '荷兰语', english: 'Dutch' },
  { value: 'km', label: '高棉语', chinese: '高棉语', english: 'Khmer' },
  { value: 'my', label: '缅甸语', chinese: '缅甸语', english: 'Burmese' },
  { value: 'fa', label: '波斯语', chinese: '波斯语', english: 'Persian' },
  { value: 'gu', label: '古吉拉特语', chinese: '古吉拉特语', english: 'Gujarati' },
  { value: 'ur', label: '乌尔都语', chinese: '乌尔都语', english: 'Urdu' },
  { value: 'te', label: '泰卢固语', chinese: '泰卢固语', english: 'Telugu' },
  { value: 'mr', label: '马拉地语', chinese: '马拉地语', english: 'Marathi' },
  { value: 'he', label: '希伯来语', chinese: '希伯来语', english: 'Hebrew' },
  { value: 'bn', label: '孟加拉语', chinese: '孟加拉语', english: 'Bengali' },
  { value: 'ta', label: '泰米尔语', chinese: '泰米尔语', english: 'Tamil' },
  { value: 'uk', label: '乌克兰语', chinese: '乌克兰语', english: 'Ukrainian' },
  { value: 'bo', label: '藏语', chinese: '藏语', english: 'Tibetan' },
  { value: 'kk', label: '哈萨克语', chinese: '哈萨克语', english: 'Kazakh' },
  { value: 'mn', label: '蒙古语', chinese: '蒙古语', english: 'Mongolian' },
  { value: 'ug', label: '维吾尔语', chinese: '维吾尔语', english: 'Uyghur' },
  { value: 'yue', label: '粤语', chinese: '粤语', english: 'Cantonese' },
];

export default function TranslationPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8080');
  const [useChineseTemplate, setUseChineseTemplate] = useState(true);
  const [translationHistory, setTranslationHistory] = useState<any[]>([]);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  
  // 模型相关状态
  const [models, setModels] = useState<Array<{name: string, model: string}>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string>('');
  
  // 本地存储相关状态
  const [enableLocalStorage, setEnableLocalStorage] = useState<boolean>(() => {
    // 从本地存储加载enableLocalStorage状态
    const savedConfig = localStorage.getItem('fanyi_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        return config.enableLocalStorage !== undefined ? config.enableLocalStorage : false;
      } catch (error) {
        console.error('加载本地存储状态失败:', error);
      }
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<string>('translation');
  const [apiUrlValidated, setApiUrlValidated] = useState<boolean>(false);
  
  // 流式输出相关状态
  const [streamingEnabled, setStreamingEnabled] = useState<boolean>(() => {
    // 从本地存储加载streamingEnabled状态，默认开启
    const savedConfig = localStorage.getItem('fanyi_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        return config.streamingEnabled !== undefined ? config.streamingEnabled : true;
      } catch (error) {
        console.error('加载流式输出状态失败:', error);
      }
    }
    return true; // 默认开启
  });
  const [streamingText, setStreamingText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  // 术语干预相关状态
  const [termInterventionEnabled, setTermInterventionEnabled] = useState<boolean>(false);
  const [termPairs, setTermPairs] = useState<Array<{source: string, target: string}>>([]);
  
  // OpenAI客户端引用
  const openaiClientRef = useRef<OpenAI | null>(null);

  // 保存配置到本地存储（只在API地址验证成功后保存）
  const saveConfigToLocalStorage = () => {
    if (!enableLocalStorage) return;
    
    // 如果API地址尚未验证成功，不保存API地址
    const config = {
      // 只有API地址验证成功后才保存，否则使用之前的有效地址
      apiUrl: apiUrlValidated ? apiUrl : undefined,
      selectedModel,
      useChineseTemplate,
      autoDetectEnabled,
      streamingEnabled, // 保存流式输出开关状态
      enableLocalStorage, // 保存本地存储开关状态
      sourceLang: form.getFieldValue('sourceLang'),
      targetLang: form.getFieldValue('targetLang'),
    };
    
    // 过滤掉undefined值
    const filteredConfig = Object.fromEntries(
      Object.entries(config).filter(([_, value]) => value !== undefined)
    );
    
    localStorage.setItem('fanyi_config', JSON.stringify(filteredConfig));
  };

  // 从本地存储加载配置（不包含模型验证）
  const loadConfigFromLocalStorage = () => {
    if (!enableLocalStorage) return;
    
    const savedConfig = localStorage.getItem('fanyi_config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        
        // 设置API地址
        setApiUrl(config.apiUrl || 'http://127.0.0.1:8080');
        
        // 设置其他配置
        setUseChineseTemplate(config.useChineseTemplate ?? true);
        setAutoDetectEnabled(config.autoDetectEnabled ?? true);
        
        // 设置语言选择
        if (config.sourceLang && config.targetLang) {
          form.setFieldsValue({
            sourceLang: config.sourceLang,
            targetLang: config.targetLang,
          });
        }
        
        // 注意：selectedModel将在获取模型列表后验证并设置
      } catch (error) {
        console.error('加载配置失败:', error);
      }
    }
  };

  // 在获取模型列表后验证并设置保存的模型
  const validateAndSetSavedModel = (modelList: Array<{name: string, model: string}>) => {
    // 首先尝试从本地存储加载保存的模型（如果本地存储开启）
    if (enableLocalStorage) {
      const savedConfig = localStorage.getItem('fanyi_config');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          const savedModel = config.selectedModel;
          
          if (savedModel) {
            // 检查保存的模型是否在当前模型列表中
            const modelExists = modelList.some(model => 
              model.model === savedModel || model.name === savedModel
            );
            
            if (modelExists) {
              setSelectedModel(savedModel);
              return; // 如果找到保存的模型，直接返回
            }
          }
        } catch (error) {
          console.error('验证模型失败:', error);
        }
      }
    }
    
    // 如果没有保存的配置、保存的模型不存在、或本地存储关闭，使用第一个可用模型
    if (modelList.length > 0) {
      const firstModel = modelList[0].model || modelList[0].name;
      setSelectedModel(firstModel);
    }
  };

  // 获取模型列表
  const fetchModels = async () => {
    if (!apiUrl) return;
    
    setLoadingModels(true);
    setModelError('');
    
    try {
      const response = await axios.get(`${apiUrl}/models`, {
        headers: { 'Accept': 'application/json' }
      });
      
      // 从响应中提取模型列表
      const modelList = response.data.models || [];
      setModels(modelList);
      
      // 验证并设置保存的模型
      validateAndSetSavedModel(modelList);
      
      // API地址验证成功
      setApiUrlValidated(true);
      
    } catch (error: any) {
      console.error('获取模型失败:', error);
      setModelError(`获取模型失败: ${error.message || '请检查API连接'}`);
      // 请求失败时清空模型列表，确保UI显示"无可用模型"
      setModels([]);
      setSelectedModel('');
      // API地址验证失败
      setApiUrlValidated(false);
      enableLocalStorage?message.warning("模型列表请求失败，api地址将不储存"):null;
    } finally {
      setLoadingModels(false);
    }
  };

  // 组件加载时加载配置并获取模型
  useEffect(() => {
    loadConfigFromLocalStorage();
    // 延迟一点时间，确保API地址已设置
    setTimeout(() => {
      fetchModels();
    }, 100);
  }, []);

  // 配置变化时保存到本地存储
  useEffect(() => {
    saveConfigToLocalStorage();
  }, [apiUrl, selectedModel, useChineseTemplate, autoDetectEnabled, streamingEnabled, enableLocalStorage]);

  // 检查是否为中文语系
  const isChineseLanguage = (langCode: string): boolean => {
    const chineseLanguages = ['zh', 'zh-Hant', 'yue'];
    return chineseLanguages.includes(langCode);
  };

  // 根据选择的语言自动设置翻译模板
  const updateTemplateBasedOnLanguages = () => {
    if (!autoDetectEnabled) return;
    
    const sourceLang = form.getFieldValue('sourceLang');
    const targetLang = form.getFieldValue('targetLang');
    
    // 如果源语言或目标语言是中文语系，使用中外翻译模板
    // 否则使用外外翻译模板
    const shouldUseChineseTemplate = isChineseLanguage(sourceLang) || isChineseLanguage(targetLang);
    setUseChineseTemplate(shouldUseChineseTemplate);
  };

  // 处理源语言变化
  const handleSourceLangChange = (value: string) => {
    form.setFieldsValue({ sourceLang: value });
    updateTemplateBasedOnLanguages();
  };

  // 处理目标语言变化
  const handleTargetLangChange = (value: string) => {
    form.setFieldsValue({ targetLang: value });
    updateTemplateBasedOnLanguages();
  };

  // 交换源语言和目标语言
  const swapLanguages = () => {
    const sourceLang = form.getFieldValue('sourceLang');
    const targetLang = form.getFieldValue('targetLang');
    form.setFieldsValue({
      sourceLang: targetLang,
      targetLang: sourceLang,
    });
    // 交换后更新模板
    updateTemplateBasedOnLanguages();
  };

  // 复制翻译结果
  const copyToClipboard = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      message.success('已复制到剪贴板');
    }
  };

  // 获取语言名称（根据当前翻译模板返回相应语言名）
  const getLanguageName = (code: string): string => {
    const lang = LANGUAGES.find(l => l.value === code);
    if (!lang) return code;
    
    // 中外翻译模板使用中文名，外外翻译模板使用英文名
    return useChineseTemplate ? lang.chinese : lang.english;
  };

  // 获取Select中显示的语言标签
  const getLanguageLabel = (lang: typeof LANGUAGES[0]): string => {
    if (useChineseTemplate) {
      // 中外翻译模板：显示"中文 (Chinese)"格式
      return `${lang.chinese} (${lang.english})`;
    } else {
      // 外外翻译模板：显示"Chinese (中文)"格式
      return `${lang.english} (${lang.chinese})`;
    }
  };

  // 初始化OpenAI客户端
  const getOpenAIClient = () => {
    if (!openaiClientRef.current) {
      openaiClientRef.current = new OpenAI({
        baseURL: apiUrl,
        apiKey: 'not-needed', // 混元大模型API不需要真正的API key
        dangerouslyAllowBrowser: true,
      });
    }
    return openaiClientRef.current;
  };

  // 执行翻译（支持流式和非流式）
  const handleTranslate = async (values: any) => {
    const { sourceText, sourceLang, targetLang } = values;
    
    if (!sourceText.trim()) {
      message.warning('请输入要翻译的文本');
      return;
    }

    if (sourceLang === targetLang) {
      message.warning('源语言和目标语言不能相同');
      return;
    }

    // 检查是否有可用的模型
    if (models.length === 0) {
      message.error('无可用模型，请检查API连接并确保已加载模型');
      return;
    }

    const modelToUse = selectedModel || (models[0].model || models[0].name);
    if (!modelToUse) {
      message.error('没有可用的模型，请检查API连接');
      return;
    }

    // 构建提示词模板
    let prompt = '';
    
    // 添加术语干预前缀（只在中外模板且启用术语干预且有术语对时）
    if (useChineseTemplate && termInterventionEnabled && termPairs.length > 0) {
      // 过滤掉空的术语对
      const validTermPairs = termPairs.filter(pair => pair.source.trim() && pair.target.trim());
      if (validTermPairs.length > 0) {
        const termPrefix = validTermPairs.map(pair => 
          `${pair.source} 翻译成 ${pair.target}`
        ).join('\n');
        prompt += `参考下面的翻译：\n${termPrefix}\n\n`;
      }
    }

    // 添加原有模板
    if (useChineseTemplate) {
      prompt += `将以下文本翻译为${getLanguageName(targetLang)}，注意只需要输出翻译后的结果，不要额外解释：\n\n${sourceText}`;
    } else {
      prompt += `Translate the following segment into ${getLanguageName(targetLang)}, without additional explanation.\n\n${sourceText}`;
    }

    // 根据流式输出设置选择不同的翻译方式
    if (streamingEnabled) {
      await handleStreamingTranslate(prompt, modelToUse, sourceText, sourceLang, targetLang);
    } else {
      await handleNonStreamingTranslate(prompt, modelToUse, sourceText, sourceLang, targetLang);
    }
  };

  // 非流式翻译
  const handleNonStreamingTranslate = async (prompt: string, modelToUse: string, sourceText: string, sourceLang: string, targetLang: string) => {
    setLoading(true);
    setTranslatedText('');

    try {
      // 使用OpenAI SDK进行非流式调用
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: modelToUse,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: false,
      });

      const translated = response.choices[0]?.message?.content || '翻译失败';
      setTranslatedText(translated);

      // 保存到历史记录
      saveToHistory(sourceText, translated, sourceLang, targetLang, modelToUse);

      message.success('翻译完成');
    } catch (error: any) {
      console.error('翻译错误:', error);
      message.error(`翻译失败: ${error.message || '请检查API连接'}`);
      setTranslatedText('翻译失败，请检查API连接和配置');
    } finally {
      setLoading(false);
    }
  };

  // 流式翻译
  const handleStreamingTranslate = async (prompt: string, modelToUse: string, sourceText: string, sourceLang: string, targetLang: string) => {
    setLoading(true);
    setIsStreaming(true);
    setTranslatedText('');
    setStreamingText('');

    try {
      // 使用OpenAI SDK进行流式调用
      const client = getOpenAIClient();
      const stream = await client.chat.completions.create({
        model: modelToUse,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        stream: true,
      });

      let fullTranslatedText = '';
      
      // 处理流式响应
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullTranslatedText += content;
          setStreamingText(fullTranslatedText);
          setTranslatedText(fullTranslatedText); // 同时更新主翻译文本
        }
      }

      // 流式完成
      setTranslatedText(fullTranslatedText);
      setStreamingText('');

      // 保存到历史记录
      saveToHistory(sourceText, fullTranslatedText, sourceLang, targetLang, modelToUse);

      message.success('翻译完成');
    } catch (error: any) {
      console.error('流式翻译错误:', error);
      message.error(`翻译失败: ${error.message || '请检查API连接'}`);
      setTranslatedText('翻译失败，请检查API连接和配置');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  // 保存到历史记录
  const saveToHistory = (sourceText: string, translatedText: string, sourceLang: string, targetLang: string, modelToUse: string) => {
    const historyItem = {
      id: Date.now(),
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      model: modelToUse,
      timestamp: new Date().toLocaleString(),
    };
    setTranslationHistory(prev => [historyItem, ...prev.slice(0, 9)]); // 保留最近10条
  };

  return (
    <div className="translation-container">
      <Card title={
        <Space>
          <TranslationOutlined />
          <span>翻译工具(腾讯混元驱动)</span>
        </Space>
      }>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>

          {/* 翻译标签页 */}
          <TabPane tab="翻译" key="translation">
            <Form
              form={form}
              onFinish={handleTranslate}
              initialValues={{
                sourceLang: 'en',
                targetLang: 'zh',
              }}
            >
              <Row gutter={[24, 24]}>
                {/* 语言选择 */}
                <Col span={24}>
                  <Card size="small">
                    <Row gutter={16} align="middle">
                      <Col span={10}>
                        <Form.Item name="sourceLang" label="源语言" style={{ marginBottom: 0 }}>
                          <Select
                            style={{ width: '100%' }}
                            placeholder="选择源语言"
                            showSearch
                            optionFilterProp="children"
                            onChange={handleSourceLangChange}
                          >
                            {LANGUAGES.map(lang => (
                              <Option key={lang.value} value={lang.value}>
                                {lang.chinese} ({lang.english})
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={4} style={{ textAlign: 'center' }}>
                        <Button 
                          type="text" 
                          icon={<SwapOutlined />} 
                          onClick={swapLanguages}
                          title="交换语言"
                        />
                      </Col>
                      <Col span={10}>
                        <Form.Item name="targetLang" label="目标语言" style={{ marginBottom: 0 }}>
                          <Select
                            style={{ width: '100%' }}
                            placeholder="选择目标语言"
                            showSearch
                            optionFilterProp="children"
                            onChange={handleTargetLangChange}
                          >
                            {LANGUAGES.map(lang => (
                              <Option key={lang.value} value={lang.value}>
                                {lang.chinese} ({lang.english})
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                </Col>

                {/* 文本输入和输出 */}
                <Col xs={24} md={12}>
                  <Card 
                    title="输入文本" 
                    size="small"
                    extra={<Text type="secondary">支持多行文本</Text>}
                  >
                    <Form.Item name="sourceText" rules={[{ required: true, message: '请输入要翻译的文本' }]}>
                      <TextArea
                        placeholder="请输入要翻译的文本..."
                        autoSize={{ minRows: 10, maxRows: 15 }}
                        allowClear
                      />
                    </Form.Item>
                  </Card>
                </Col>

                <Col xs={24} md={12}>
                  <Card 
                    title="翻译结果" 
                    size="small"
                    extra={
                      <Space>
                        {isStreaming && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            流式输出中...
                          </Text>
                        )}
                        <Button 
                          type="text" 
                          icon={<CopyOutlined />} 
                          onClick={copyToClipboard}
                          disabled={!translatedText}
                        >
                          复制
                        </Button>
                      </Space>
                    }
                  >
                    <div className="translation-result">
                      {loading && !isStreaming ? (
                        // 非流式翻译的加载状态
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <Spin size="large" />
                          <div style={{ marginTop: 16 }}>正在翻译中...</div>
                        </div>
                      ) : isStreaming ? (
                        // 流式翻译：直接显示实时内容，保留样式但不显示加载动画
                        <div style={{ 
                          padding: 12, 
                          background: '#f9f9f9', 
                          borderRadius: 4,
                          textAlign: 'left',
                          minHeight: '200px',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>实时输出:</Text>
                          <div style={{ marginTop: 8 }}>
                            {streamingText || '开始翻译...'}
                          </div>
                        </div>
                      ) : translatedText ? (
                        // 翻译完成
                        <div className="result-text">{translatedText}</div>
                      ) : (
                        // 初始状态
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                          <GlobalOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                          <div>翻译结果将显示在这里</div>
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>

                {/* 操作按钮 */}
                <Col span={24}>
                  <div style={{ textAlign: 'center' }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<TranslationOutlined />}
                      onClick={() => form.submit()}
                      loading={loading}
                      style={{ width: 200 }}
                    >
                      {loading ? '翻译中...' : '开始翻译'}
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          </TabPane>

          {/* 历史记录标签页 */}
          <TabPane tab="历史记录" key="history">
            {translationHistory.length > 0 ? (
              <Card 
                title="最近翻译记录" 
                size="small"
                extra={
                  <Button 
                    type="text" 
                    size="small"
                    onClick={() => setTranslationHistory([])}
                  >
                    清空记录
                  </Button>
                }
              >
                <Row gutter={[16, 16]}>
                  {translationHistory.map(item => (
                    <Col span={24} key={item.id}>
                      <Card size="small">
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Text strong>{getLanguageName(item.sourceLang)} → {getLanguageName(item.targetLang)}</Text>
                            <div style={{ fontSize: '12px', color: '#999' }}>{item.timestamp}</div>
                          </Col>
                          <Col>
                            <Space>
                              <Button 
                                size="small" 
                                onClick={() => {
                                  form.setFieldsValue({
                                    sourceText: item.sourceText,
                                    sourceLang: item.sourceLang,
                                    targetLang: item.targetLang,
                                  });
                                  setActiveTab('translation');
                                }}
                              >
                                复用
                              </Button>
                            </Space>
                          </Col>
                        </Row>
                        <Divider style={{ margin: '8px 0' }} />
                        <Row gutter={16}>
                          <Col span={12}>
                            <Text type="secondary">原文：</Text>
                            <div style={{ marginTop: 4 }}>{item.sourceText}</div>
                          </Col>
                          <Col span={12}>
                            <Text type="secondary">译文：</Text>
                            <div style={{ marginTop: 4 }}>{item.translatedText}</div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            ) : (
              <Card size="small">
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                  <GlobalOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                  <div>暂无翻译记录</div>
                  <div style={{ marginTop: 8 }}>开始翻译后，记录将显示在这里</div>
                </div>
              </Card>
            )}
          </TabPane>
          {/* 配置标签页 */}
          <TabPane tab="配置" key="config">
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form layout="inline">
                  <Form.Item label="API地址">
                    <Space>
                      <Input
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        onBlur={fetchModels}
                        placeholder="http://127.0.0.1:8080"
                        style={{ width: 280 }}
                        prefix={<ApiOutlined />}
                      />
                      <Button 
                        type="primary" 
                        onClick={fetchModels}
                        loading={loadingModels}
                        icon={<ApiOutlined />}
                      >
                        刷新模型
                      </Button>
                    </Space>
                  </Form.Item>
                  <Form.Item label="模型选择">
                    {loadingModels ? (
                      <Spin size="small" />
                    ) : models.length > 0 ? (
                      <Select
                        value={selectedModel}
                        onChange={setSelectedModel}
                        style={{ width: 250 }}
                        placeholder="选择模型"
                      >
                        {models.map((model, index) => (
                          <Option key={index} value={model.model || model.name}>
                            {model.name || model.model}
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      <Text type="secondary">无可用模型</Text>
                    )}
                  </Form.Item>
                  <Form.Item label="自动检测模板">
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                      checked={autoDetectEnabled}
                      onChange={(checked) => {
                        setAutoDetectEnabled(checked);
                        if (checked) {
                          updateTemplateBasedOnLanguages();
                        }
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="翻译模板">
                    <Switch
                      checkedChildren="中外翻译"
                      unCheckedChildren="外外翻译"
                      checked={useChineseTemplate}
                      onChange={setUseChineseTemplate}
                      disabled={autoDetectEnabled}
                    />
                  </Form.Item>
                  <Form.Item label="流式输出">
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                      checked={streamingEnabled}
                      onChange={(checked) => {
                        setStreamingEnabled(checked);
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="本地存储">
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                      checked={enableLocalStorage}
                      onChange={(checked) => {
                        setEnableLocalStorage(checked);
                        if (checked) {
                          // 开启时立即保存当前配置
                          saveConfigToLocalStorage();
                        } else {
                          // 关闭时清除本地存储
                          localStorage.removeItem('fanyi_config');
                        }
                      }}
                    />
                  </Form.Item>
                </Form>
                {modelError && (
                  <Alert
                    message={modelError}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setModelError('')}
                    action={
                      <Button size="small" type="primary" onClick={fetchModels}>
                        重试
                      </Button>
                    }
                  />
                )}
                <Text type="secondary">
                  {autoDetectEnabled 
                    ? `自动检测：${isChineseLanguage(form.getFieldValue('sourceLang')) || isChineseLanguage(form.getFieldValue('targetLang')) 
                        ? '检测到中文语系，使用"中外翻译模板"' 
                        : '未检测到中文语系，使用"外外翻译模板"'}`
                    : (useChineseTemplate 
                      ? '手动选择：使用"中外翻译模板"：将以下文本翻译为{target_language}，注意只需要输出翻译后的结果，不要额外解释' 
                      : '手动选择：使用"外外翻译模板"：Translate the following segment into {target_language}, without additional explanation')}
                </Text>
                {selectedModel && (
                  <Text type="secondary">当前模型: {selectedModel}</Text>
                )}
                {enableLocalStorage && (
                  <Text type="secondary">配置已保存到浏览器本地存储</Text>
                )}
              </Space>
            </Card>
          </TabPane>
          {/* 术语配置标签页 */}
          <TabPane tab="术语配置" key="terms">
            <Card size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form layout="inline">
                  <Form.Item label="启用术语干预">
                    <Switch
                      checkedChildren="开启"
                      unCheckedChildren="关闭"
                      checked={termInterventionEnabled}
                      onChange={(checked) => {
                        setTermInterventionEnabled(checked);
                      }}
                    />
                  </Form.Item>
                </Form>
                
                {termInterventionEnabled && (
                  <>
                    <Alert
                      message="使用说明"
                      description={
                        <div>
                          <p>1. 术语干预仅在中外翻译模板下生效</p>
                          <p>2. 术语对不保存到本地存储，刷新页面后重置</p>
                        </div>
                      }
                      type="info"
                      showIcon
                    />
                    
                    <div style={{ marginTop: 16 }}>
                      <Text strong>术语对列表：</Text>
                      <div style={{ marginTop: 8 }}>
                        {termPairs.map((pair, index) => (
                          <Row key={index} gutter={8} style={{ marginBottom: 8 }}>
                            <Col span={10}>
                              <Input
                                placeholder="源术语"
                                value={pair.source}
                                onChange={(e) => {
                                  const newPairs = [...termPairs];
                                  newPairs[index].source = e.target.value;
                                  setTermPairs(newPairs);
                                }}
                              />
                            </Col>
                            <Col span={2} style={{ textAlign: 'center', lineHeight: '32px' }}>
                              →
                            </Col>
                            <Col span={10}>
                              <Input
                                placeholder="目标术语"
                                value={pair.target}
                                onChange={(e) => {
                                  const newPairs = [...termPairs];
                                  newPairs[index].target = e.target.value;
                                  setTermPairs(newPairs);
                                }}
                              />
                            </Col>
                            <Col span={2}>
                              <Button
                                type="text"
                                danger
                                onClick={() => {
                                  const newPairs = termPairs.filter((_, i) => i !== index);
                                  setTermPairs(newPairs);
                                }}
                              >
                                删除
                              </Button>
                            </Col>
                          </Row>
                        ))}
                      </div>
                      
                      <div style={{ marginTop: 16 }}>
                        <Button
                          type="dashed"
                          onClick={() => {
                            setTermPairs([...termPairs, { source: '', target: '' }]);
                          }}
                          style={{ width: '100%' }}
                        >
                          + 添加术语对
                        </Button>
                      </div>
                      
                      {termPairs.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Button
                            danger
                            onClick={() => {
                              setTermPairs([]);
                            }}
                          >
                            清空所有术语对
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {!termInterventionEnabled && (
                  <Text type="secondary">启用术语干预后，可在此配置术语对，仅在中外翻译模板下生效。</Text>
                )}
              </Space>
            </Card>
          </TabPane>

          {/* 提示标签页 */}
          <TabPane tab="提示" key="tips">
            <Alert
              message="使用说明"
              description={
                <div>
                  <p>1. 确保混元大模型API服务已启动（默认地址：http://127.0.0.1:8080）</p>
                  <p>2. 选择源语言和目标语言，支持30多种语言互译</p>
                  <p>3. 输入要翻译的文本，点击"开始翻译"按钮</p>
                  <p>4. <strong>自动检测功能</strong>：根据选择的语言自动选择翻译模板</p>
                  <p>   - 源语言或目标语言包含中文（简体/繁体/粤语）→ 使用"中外翻译模板"</p>
                  <p>   - 源语言和目标语言都不含中文 → 使用"外外翻译模板"</p>
                  <p>5. 可关闭自动检测，手动选择翻译模板</p>
                  <p>6. 翻译结果可复制到剪贴板</p>
                  <p>7. <strong>本地存储功能</strong>：开启后配置将保存到浏览器本地存储</p>
                  <p>   - 模型选择会验证当前可用模型，如果保存的模型不存在则使用第一个可用模型</p>
                </div>
              }
              type="info"
              showIcon
            />
          </TabPane>
        </Tabs>
      </Card>
      
      {/* 页脚版权和免责声明 */}
      <div className="footer-disclaimer">
        <div className="copyright-text">
          {/* 腾讯免责声明 */}
            <Text type="secondary">
              免责声明:本工具为第三方开发，使用混元大模型API进行翻译服务。
              <strong>腾讯公司与本工具无隶属、关联、赞助或背书关系。</strong>
              本工具不保证翻译结果的准确性，用户需自行判断翻译质量。
              使用本工具即表示您同意自行承担使用风险。
            </Text><br/>
          <Text type="secondary">
            Tencent HY is licensed under the Tencent HY Community License Agreement, Copyright © 2025 Tencent. All Rights Reserved. The trademark rights of “Tencent HY” are owned by Tencent or its affiliate.
          </Text>
        </div>
      </div>
    </div>
  );
}
