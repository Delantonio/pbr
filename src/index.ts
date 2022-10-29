import { GUI } from 'dat.gui';
import { mat4, vec3 } from 'gl-matrix';
import { Camera } from './camera';
//import { TriangleGeometry } from './geometries/triangle';
import { SphereGeometry } from './geometries/sphere';
import { PointLight } from './lights/lights';
import { Transform } from './transform';
import { GLContext } from './gl';
import { PBRShader } from './shader/pbr-shader';
import { Texture, Texture2D } from './textures/texture';
import { UniformType } from './types';

interface GUIProperties {
  albedo: number[];
  diffuse: boolean;
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
  //private _geometry: TriangleGeometry;
  private _transformer: Transform;
  private _geometry: SphereGeometry;
  private i = 0;
  private _plight: PointLight;

  private _uniforms: Record<string, UniformType | Texture>;

  private _textureExample: Texture2D<HTMLElement> | null;
    private _textureDiffuse: Texture2D<HTMLElement> | null;

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
    //this._geometry = new TriangleGeometry();

    //this._geometry.vec_translate(vec3.set(vec3.create(), -0.5, 0.5, 0));

    this._plight = new PointLight();
    this._plight.setPosition(0, 1, 2);

    this._transformer = new Transform();

    this._uniforms = {
      'uMaterial.albedo': vec3.create(),
      'uMaterial.roughness': 0.25,
      'uMaterial.metallic': 0.25,
      'uModel.localToProjection': mat4.create(),
      'uCamera.position': vec3.create(),
      'translationMat': mat4.create(),
      'diffuseIBL': true,
    };

    this._shader = new PBRShader();
    this._textureExample = null;
    this._textureDiffuse = null;

    this._guiProperties = {
      albedo: [255, 255, 255],
      diffuseIBL: true
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

    // Example showing how to load a texture and upload it to GPU.
    this._textureExample = await Texture2D.load(
      'assets/ggx-brdf-integrated.png'
    );
    this._textureDiffuse = await Texture2D.load(
        'assets/env/Alexs_Apt_2k-diffuse-RGBM.png'
        );
    if (this._textureExample !== null) {
      this._context.uploadTexture(this._textureExample);
      // You can then use it directly as a uniform:
      // ```uniforms.myTexture = this._textureExample;```
    }
    if (this._textureDiffuse !== null) {
      this._context.uploadTexture(this._textureDiffuse);
      this._uniforms['diffuseTex'] = this._textureDiffuse;
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


    //vec3.set(this._uniforms['uLights[0].position'] as vec3, 1.0, 0.0, 5.0);
    //vec3.set(this._uniforms['uLights[1].position'] as vec3, 2.0, 1.0, 5.0);

    const props = this._guiProperties;

    // Set the color from the GUI into the uniform list.
    vec3.set(
      this._uniforms['uMaterial.albedo'] as vec3,
      props.albedo[0] / 255,
      props.albedo[1] / 255,
      props.albedo[2] / 255
    );

    this._uniforms['diffuseIBL'] = false;


    // Sets the viewProjection matrix.
    // **Note**: if you want to modify the position of the geometry, you will
    // need to take the matrix of the mesh into account here.
    mat4.copy(
      this._uniforms['uModel.localToProjection'] as mat4,
      camera.localToProjection
    );


    // Draws the triangle.
    const roughnesses = [0.0, 0.25, 0.5, 0.75, 1.0]; 
    //const metalness = [1.0, 0.75, 0.5, 0.25, 0.05];
    const metalness = [0.0, 0.25, 0.5, 0.75, 1.0];
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
    this.i = 1;
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
    gui.add(this._guiProperties, 'diffuseIBL');
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
