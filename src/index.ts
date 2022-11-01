import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
import { SphereGeometry } from './geometries/sphere';
import { PointLight } from './lights/lights';
import { GLContext } from './gl';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';

interface GUIProperties {
  albedo: number[];
  burleyDiffuse: boolean;
  orenNayarDiffuse: boolean;
  diffuseIBL: boolean;
  specularIBL: boolean;
  rustedIron: boolean;
}

/**
 * Class representing the current application with its state.
 *
 * @class Application
 */
class Application {
  /**
   * Context used to draw to the canvas
   *
   * @private
   */
  private _context: GLContext;

  private _shader: PBRShader;
  private _geometry: SphereGeometry;
  private _plight: PointLight;

  private _uniforms: Record<string, UniformType | Texture>;

  private _GGX_BRDF: Texture2D<HTMLElement> | null;
  private _textureDiffuse: Texture2D<HTMLElement> | null;
  private _textureSpecular: Texture2D<HTMLElement> | null;
  private _textureRIalbedo: Texture2D<HTMLElement> | null;
  private _textureRInormal: Texture2D<HTMLElement> | null;
  private _textureRImetallic: Texture2D<HTMLElement> | null;
  private _textureRIroughness: Texture2D<HTMLElement> | null;

  private _camera: Camera;

  /**
   * Object updated with the properties from the GUI
   *
   * @private
   */
  private _guiProperties: GUIProperties;

  constructor(canvas: HTMLCanvasElement) {
    console.log("canvas creation");
    this._context = new GLContext(canvas);
    this._camera = new Camera();

    this._geometry = new SphereGeometry(0.15, 32, 32);

    this._plight = new PointLight();
    this._plight.setPosition(0, 1, 2);

    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uMaterial.roughness': 0.25,
      'uMaterial.metallic': 0.25,
      'uModel.localToProjection': mat4.create(),
      'uCamera.position': vec3.create(),
      'translationMat': mat4.create(),
      'diffuseIBL': false,
      'specularIBL': false,
    };

    this._shader = new PBRShader();
    this._GGX_BRDF = null;
    this._textureDiffuse = null;
    this._textureSpecular = null;

    this._textureRIalbedo = null;
    this._textureRInormal = null;
    this._textureRImetallic = null;
    this._textureRIroughness = null;

    this._guiProperties = {
      albedo: [255, 255, 255],
      burleyDiffuse: false,
      orenNayarDiffuse: false,
      diffuseIBL: false,
      specularIBL: false,
      rustedIron: false
    };

    this._createGUI();
    console.log("gui created");
  }

  /**
   * Initializes the application.
   */
  async init() {
    this._context.uploadGeometry(this._geometry);
    this._context.compileProgram(this._shader);

    this._GGX_BRDF = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    if (this._GGX_BRDF !== null) {
      this._context.uploadTexture(this._GGX_BRDF);
      this._uniforms['GGX_BRDF'] = this._GGX_BRDF;
    }
    this._textureDiffuse = await Texture2D.load(
        'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
        );
    if (this._textureDiffuse !== null) {
      this._context.uploadTexture(this._textureDiffuse);
      this._uniforms['diffuseTex'] = this._textureDiffuse;
    }
    this._textureSpecular = await Texture2D.load(
        'assets/env/Alexs_Apt_2k-specular-RGBM.png'
        );
    if (this._textureSpecular !== null) {
      this._context.uploadTexture(this._textureSpecular);
      this._uniforms['specularTex'] = this._textureSpecular;
    }

    // RUSTED IRON TEXTURES
    this._textureRIalbedo = await Texture2D.load(
        'assets/rustediron/rustediron2_basecolor.png'
        );
    if (this._textureRIalbedo !== null) {
      this._context.uploadTexture(this._textureRIalbedo);
      this._uniforms['albedo_mapRI'] = this._textureRIalbedo;
    }
    this._textureRImetallic = await Texture2D.load(
        'assets/rustediron/rustediron2_metallic.png'
        );
    if (this._textureRImetallic !== null) {
      this._context.uploadTexture(this._textureRImetallic);
      this._uniforms['metallic_mapRI'] = this._textureRImetallic;
    }
    this._textureRInormal = await Texture2D.load(
        'assets/rustediron/rustediron2_normal.png'
        );
    if (this._textureRInormal !== null) {
      this._context.uploadTexture(this._textureRInormal);
      this._uniforms['normal_mapRI'] = this._textureRInormal;
    }
    this._textureRIroughness = await Texture2D.load(
        'assets/rustediron/rustediron2_roughness.png'
        );
    if (this._textureRIroughness !== null) {
      this._context.uploadTexture(this._textureRIroughness);
      this._uniforms['roughness_mapRI'] = this._textureRIroughness;
    }
  }

  /**
   * Called at every loop, before the [[Application.render]] method.
   */
  update() {
    /** Empty. */
  }

  /**
   * Called when the canvas size changes.
   */
  resize() {
    this._context.resize();
  }

  /**
   * Called at every loop, after the [[Application.update]] method.
   */
  render() {
    this._context.clear();
    this._context.setDepthTest(true);
    // this._context.setCulling(WebGL2RenderingContext.BACK);

    const aspect =
      this._context.gl.drawingBufferWidth /
      this._context.gl.drawingBufferHeight;

    const camera = this._camera;
    vec3.set(camera.transform.position, 0.0, 0.0, 2.0);
    camera.setParameters(aspect);
    camera.update();

    vec3.copy(
      this._uniforms['uCamera.position'] as vec3,
      camera.transform.position,
    );

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    this._uniforms['burleyDiffuse'] = props.burleyDiffuse;
    this._uniforms['orenNayarDiffuse'] = props.orenNayarDiffuse;
    this._uniforms['diffuseIBL'] = props.diffuseIBL;
    this._uniforms['specularIBL'] = props.specularIBL;
    this._uniforms['rustedIron'] = props.rustedIron;

    // Sets the viewProjection matrix.
    // **Note**: if you want to modify the position of the geometry, you will
    // need to take the matrix of the mesh into account here.
    mat4.copy(
      this._uniforms['uModel.localToProjection'] as mat4,
      camera.localToProjection
    );


    // Draws the triangle.
    const roughnesses = [0.05, 0.25, 0.5, 0.75, 0.95]; 
    const metalness = [0.05, 0.25, 0.5, 0.75, 0.95];
    for (let y = -2; y < 3; y++)
    {
      for (let x = -2; x < 3; x++)
      {
        var translationMat = mat4.fromTranslation(mat4.create(), vec3.fromValues(0.25 * x, 0.4 * y, 0));

        mat4.multiply(this._uniforms['uModel.localToProjection'] as mat4,
          translationMat,
          this._camera.localToProjection);

        this._uniforms['translationMat'] = translationMat;

        this._uniforms['uMaterial.roughness'] = roughnesses[x + 2];
        this._uniforms['uMaterial.metallic'] = metalness[y + 2]

        //this._uniforms['uOffset.x'] = x * 0.3;
        //this._uniforms['uOffset.y'] = y * 0.3;

        this._context.draw(this._geometry, this._shader, this._uniforms);
      }
    }
  }

  /**
   * Creates a GUI floating on the upper right side of the page.
   *
   * ## Note
   *
   * You are free to do whatever you want with this GUI. It's useful to have
   * parameters you can dynamically change to see what happens.
   *
   *
   * @private
   */
  private _createGUI(): GUI {
    const gui = new GUI();
    gui.addColor(this._guiProperties, 'albedo');
    gui.add(this._guiProperties, 'burleyDiffuse');
    gui.add(this._guiProperties, 'orenNayarDiffuse');
    gui.add(this._guiProperties, 'diffuseIBL');
    gui.add(this._guiProperties, 'specularIBL');
    gui.add(this._guiProperties, 'rustedIron');
    return gui;
  }
}

const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const app = new Application(canvas as HTMLCanvasElement);
app.init();

function animate() {
  app.update();
  app.render();
  window.requestAnimationFrame(animate);
}
animate();

/**
 * Handles resize.
 */

const resizeObserver = new ResizeObserver((entries) => {
  if (entries.length > 0) {
    const entry = entries[0];
    canvas.width = window.devicePixelRatio * entry.contentRect.width;
    canvas.height = window.devicePixelRatio * entry.contentRect.height;
    app.resize();
  }
});

resizeObserver.observe(canvas);
