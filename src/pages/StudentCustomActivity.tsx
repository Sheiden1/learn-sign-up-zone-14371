import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const StudentCustomActivity = ({ onBack }: { onBack: () => void }) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [tasks, setTasks] = useState<string[]>([""]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<"manual" | "pdf">("manual");
  const [numQuestions, setNumQuestions] = useState<string>("5");

  const addTask = () => {
    setTasks([...tasks, ""]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const handleGenerateFromPdf = async () => {
    if (!pdfFile || !subject) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um PDF e uma matéria",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('subject', subject);
      formData.append('numQuestions', numQuestions);

      const { data, error } = await supabase.functions.invoke('generate-questions-from-pdf', {
        body: formData,
      });

      if (error) throw error;

      if (data?.questions) {
        const generatedTasks = data.questions.map((q: any, idx: number) => 
          `${idx + 1}. ${q.question}\nA) ${q.alternatives[0].text}\nB) ${q.alternatives[1].text}\nC) ${q.alternatives[2].text}\nD) ${q.alternatives[3].text}\nResposta: ${q.alternatives.find((a: any) => a.correct)?.text}`
        );
        setTasks(generatedTasks);
        setTitle(`Questões de ${subject} - Geradas por IA`);
        setDescription(`Questões geradas automaticamente a partir do PDF: ${pdfFile.name}`);
        
        toast({
          title: "Questões Geradas!",
          description: `${data.questions.length} questões foram criadas com sucesso!`,
        });
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast({
        title: "Erro ao gerar questões",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Atividade Criada",
      description: "Sua atividade personalizada foi criada com sucesso!",
    });
    setTitle("");
    setDescription("");
    setSubject("");
    setTasks([""]);
    setPdfFile(null);
    setMode("manual");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      <div className="container mx-auto px-4 py-8">
        <Button
          onClick={onBack}
          variant="outline"
          className="mb-6 hover:scale-105 transition-all"
        >
          Voltar ao Dashboard
        </Button>

        <Card className="p-8 shadow-hover border-border/50">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Criar Atividade Personalizada
          </h1>
          <p className="text-muted-foreground mb-8">
            Organize seus estudos criando suas próprias atividades ou use IA para gerar questões a partir de um PDF
          </p>

          <div className="flex gap-4 mb-6">
            <Button
              type="button"
              variant={mode === "manual" ? "default" : "outline"}
              onClick={() => setMode("manual")}
              className="flex-1"
            >
              Criar Manualmente
            </Button>
            <Button
              type="button"
              variant={mode === "pdf" ? "default" : "outline"}
              onClick={() => setMode("pdf")}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              Gerar com IA (PDF)
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Atividade</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Revisão de Matemática"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Matéria</Label>
              <Select value={subject} onValueChange={setSubject} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matéria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matematica">Matemática</SelectItem>
                  <SelectItem value="portugues">Português</SelectItem>
                  <SelectItem value="ciencias">Ciências</SelectItem>
                  <SelectItem value="historia">História</SelectItem>
                  <SelectItem value="geografia">Geografia</SelectItem>
                  <SelectItem value="ingles">Inglês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "pdf" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-upload">Upload PDF</Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                    required={mode === "pdf"}
                  />
                  {pdfFile && (
                    <p className="text-sm text-muted-foreground">
                      Arquivo: {pdfFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num-questions">Quantidade de Questões</Label>
                  <Select value={numQuestions} onValueChange={setNumQuestions}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 questões</SelectItem>
                      <SelectItem value="10">10 questões</SelectItem>
                      <SelectItem value="15">15 questões</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  onClick={handleGenerateFromPdf}
                  disabled={isGenerating || !pdfFile || !subject}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando {numQuestions} Questões...
                    </>
                  ) : (
                    `Gerar ${numQuestions} Questões com IA`
                  )}
                </Button>
              </div>
            )}

            {mode === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo desta atividade"
                  rows={4}
                  required
                />
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Tarefas</Label>
                <Button
                  type="button"
                  onClick={addTask}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Tarefa
                </Button>
              </div>

              {tasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={task}
                    onChange={(e) => updateTask(index, e.target.value)}
                    placeholder={`Tarefa ${index + 1}`}
                    required
                  />
                  {tasks.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeTask(index)}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full">
              Criar Atividade
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default StudentCustomActivity;
